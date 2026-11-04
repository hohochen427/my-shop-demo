import { db } from "@/lib/db";
import { ecpayConfig, verifyCheckMacValue } from "@/lib/ecpay";

export const dynamic = "force-dynamic";

function reply(body: string, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

// POST /api/ecpay/notify：綠界付款結果通知（Webhook）
// 要相信的是綠界的通知，不是客人說「我付了」。
// 綠界可能重送同一筆通知，所以用綠界交易編號查帳本，處理過就不再處理（冪等）。
export async function POST(req: Request) {
  let cfg;
  try {
    cfg = ecpayConfig();
  } catch {
    return reply("0|ConfigError", 500);
  }

  const form = await req.formData();
  const p: Record<string, string> = {};
  form.forEach((v, k) => {
    p[k] = String(v);
  });

  // 1. 檢查碼不對，代表不是綠界送的或被竄改過
  if (!verifyCheckMacValue(p, cfg.hashKey, cfg.hashIV)) return reply("0|CheckMacValueError", 400);

  const ecpayTradeNo = p.TradeNo;
  const merchantTradeNo = p.MerchantTradeNo;
  const amount = Number(p.TradeAmt);
  const success = p.RtnCode === "1";
  const simulated = p.SimulatePaid === "1";
  if (!ecpayTradeNo || !merchantTradeNo) return reply("0|MissingFields", 400);

  const client = await db().connect();
  try {
    await client.query("BEGIN");

    // 2. 先記進帳本；同一個綠界交易編號已經記過，就直接回 OK、不重複處理
    const ins = await client.query(
      `INSERT INTO payments (ecpay_trade_no, merchant_trade_no, rtn_code, amount, simulate_paid, raw)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (ecpay_trade_no) DO NOTHING RETURNING id`,
      [ecpayTradeNo, merchantTradeNo, p.RtnCode ?? "", Number.isFinite(amount) ? amount : 0, simulated, JSON.stringify(p)]
    );
    if (ins.rowCount === 0) {
      await client.query("COMMIT");
      return reply("1|OK");
    }

    const { rows } = await client.query(
      "SELECT id, status, payment_status, total FROM orders WHERE merchant_trade_no = $1 FOR UPDATE",
      [merchantTradeNo]
    );
    const order = rows[0];
    if (!order) {
      await client.query("COMMIT");
      console.warn("收到找不到訂單的付款通知", merchantTradeNo);
      return reply("1|OK");
    }

    // 正式環境不接受綠界後台的「模擬付款」
    if (simulated && cfg.mode === "production") {
      await client.query("COMMIT");
      return reply("1|OK");
    }

    if (success) {
      if (amount !== order.total) {
        await client.query("UPDATE orders SET review_note = $2 WHERE id = $1", [
          order.id,
          `付款金額 ${amount} 與訂單金額 ${order.total} 不符，請人工核對`,
        ]);
      } else if (order.payment_status === "paid") {
        await client.query("UPDATE orders SET review_note = $2 WHERE id = $1", [
          order.id,
          `同一張訂單收到第二筆付款（綠界交易編號 ${ecpayTradeNo}），請確認是否需要退款`,
        ]);
      } else if (order.status === "cancelled") {
        // 已取消的訂單不准自動跳回已付款，交給人處理
        await client.query("UPDATE orders SET payment_status = 'paid', paid_at = now(), review_note = $2 WHERE id = $1", [
          order.id,
          "訂單已取消卻收到付款，請人工處理退款",
        ]);
      } else {
        await client.query(
          `UPDATE orders SET payment_status = 'paid', paid_at = now(),
             status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END
           WHERE id = $1`,
          [order.id]
        );
        // 確定收到錢，才扣庫存
        await client.query(
          `UPDATE products p SET stock = GREATEST(p.stock - oi.quantity, 0)
           FROM order_items oi WHERE oi.order_id = $1 AND oi.product_id = p.id`,
          [order.id]
        );
      }
    } else if (order.payment_status === "unpaid") {
      await client.query("UPDATE orders SET payment_status = 'failed' WHERE id = $1", [order.id]);
    }

    await client.query("COMMIT");
    return reply("1|OK");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("處理付款通知失敗", e);
    // 回非 1|OK，綠界會稍後重送
    return reply("0|Error", 500);
  } finally {
    client.release();
  }
}
