import type { Pool, PoolClient } from "pg";
import { formatNT } from "@/lib/shop";

// 優惠碼：能不能用、折多少，一律在後端判斷。前端送來的只有碼的文字。

export type Coupon = {
  id: number;
  code: string;
  kind: "fixed" | "percent";
  value: number;
  max_discount: number | null;
  min_subtotal: number;
  starts_at: Date;
  ends_at: Date | null;
  total_limit: number | null;
  per_email_limit: number | null;
  active: boolean;
};

export function normalizeCode(v: unknown): string {
  return typeof v === "string" ? v.trim().toUpperCase().slice(0, 40) : "";
}

// 折扣只扣商品小計、不扣運費；總額至少留 1 元（綠界不收 0 元）
export function discountFor(c: Pick<Coupon, "kind" | "value" | "max_discount">, subtotal: number, shipping: number): number {
  let d = c.kind === "fixed" ? c.value : Math.floor((subtotal * c.value) / 100);
  if (c.max_discount) d = Math.min(d, c.max_discount);
  return Math.max(0, Math.min(d, subtotal, subtotal + shipping - 1));
}

type Result =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; error: string; status: number };

// lock = true：建立訂單時用。鎖住這個碼，同時結帳的人要排隊，名額才不會超用。
// email 是空的（購物車預覽還沒填）就先不檢查每人次數，送出訂單時一定會再檢查一次。
export async function checkCoupon(
  client: Pool | PoolClient,
  input: { code: string; email: string; subtotal: number; shipping: number; lock: boolean }
): Promise<Result> {
  const { rows } = await client.query(
    `SELECT id, code, kind, value, max_discount, min_subtotal, starts_at, ends_at, total_limit, per_email_limit, active
     FROM coupons WHERE code = $1 ${input.lock ? "FOR UPDATE" : ""}`,
    [input.code]
  );
  const c: Coupon | undefined = rows[0];
  if (!c) return { ok: false, error: "找不到這個優惠碼", status: 400 };
  if (!c.active) return { ok: false, error: "這個優惠碼已停用", status: 400 };
  const now = Date.now();
  if (now < new Date(c.starts_at).getTime() || (c.ends_at && now >= new Date(c.ends_at).getTime())) {
    return { ok: false, error: "這個優惠碼還沒開始或已經過期", status: 400 };
  }
  if (input.subtotal < c.min_subtotal) {
    return { ok: false, error: `商品滿 ${formatNT(c.min_subtotal)} 才能使用`, status: 400 };
  }

  // 已用次數只算沒退回的紀錄（訂單取消時會填 released_at）
  const { rows: used } = await client.query(
    `SELECT count(*)::int AS total, count(*) FILTER (WHERE email = $2)::int AS mine
     FROM coupon_redemptions WHERE coupon_id = $1 AND released_at IS NULL`,
    [c.id, input.email]
  );
  if (c.total_limit !== null && used[0].total >= c.total_limit) {
    return { ok: false, error: "這個優惠碼已經被用完了", status: 409 };
  }
  if (input.email && c.per_email_limit !== null && used[0].mine >= c.per_email_limit) {
    return { ok: false, error: "這個 Email 已經用過這個優惠碼", status: 409 };
  }

  const discount = discountFor(c, input.subtotal, input.shipping);
  if (discount <= 0) return { ok: false, error: "這個優惠碼不適用這筆訂單", status: 400 };
  return { ok: true, coupon: c, discount };
}
