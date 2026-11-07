import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shippingFor } from "@/lib/shop";
import { checkCoupon, normalizeCode } from "@/lib/coupons";

export const dynamic = "force-dynamic";

type Body = {
  code?: unknown;
  email?: unknown;
  items?: { productId?: unknown; quantity?: unknown }[];
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// POST /api/coupons/check：購物車按「套用」時，先問後端這個碼能折多少。
// 只是預覽：不鎖名額、不寫入。真正的折扣在建立訂單時（/api/orders）重新算一次。
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return bad("送來的資料格式不對");
  }

  const code = normalizeCode(body.code);
  if (!code) return bad("請輸入優惠碼");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 120) : "";

  const raw = Array.isArray(body.items) ? body.items : [];
  const qty = new Map<number, number>();
  for (const it of raw) {
    const id = Number(it.productId);
    const q = Number(it.quantity);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(q) || q <= 0 || q > 20) {
      return bad("購物車裡有商品或數量不正確");
    }
    qty.set(id, (qty.get(id) ?? 0) + q);
  }
  if (qty.size === 0) return bad("購物車是空的");
  if (qty.size > 20) return bad("一次最多 20 種商品");

  try {
    const ids = [...qty.keys()];
    const { rows: products } = await db().query("SELECT id, price FROM products WHERE id = ANY($1::int[])", [ids]);
    if (products.length !== ids.length) return bad("有商品已經下架，請重新整理購物車");

    const subtotal = products.reduce((s: number, p: { id: number; price: number }) => s + p.price * qty.get(p.id)!, 0);
    const shipping = shippingFor(subtotal);
    const r = await checkCoupon(db(), { code, email, subtotal, shipping, lock: false });
    if (!r.ok) return bad(r.error, r.status);
    return NextResponse.json({ code, discount: r.discount, subtotal, shipping, total: subtotal + shipping - r.discount });
  } catch (e) {
    console.error("檢查優惠碼失敗", e);
    return bad("暫時無法檢查優惠碼，請稍後再試", 500);
  }
}
