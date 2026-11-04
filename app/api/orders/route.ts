import crypto from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shippingFor } from "@/lib/shop";
import { buildCheckoutFields, ecpayConfig, newMerchantTradeNo } from "@/lib/ecpay";
import { siteOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";

type Body = {
  items?: { productId?: unknown; quantity?: unknown }[];
  customer?: { name?: unknown; email?: unknown; phone?: unknown; address?: unknown };
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// POST /api/orders：建立訂單。
// 前端只告訴我們「哪個商品、幾個」，價格、運費、總金額一律在這裡重新算。
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return bad("送來的資料格式不對");
  }

  // 1. 檢查客人資料
  const name = text(body.customer?.name, 50);
  const email = text(body.customer?.email, 120).toLowerCase();
  const phone = text(body.customer?.phone, 30);
  const address = text(body.customer?.address, 200);
  if (!name || !email || !phone || !address) return bad("姓名、Email、電話、地址都要填");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Email 格式不對");

  // 2. 檢查購物車：同一商品合併數量
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

  let cfgOk = true;
  try {
    ecpayConfig();
  } catch {
    cfgOk = false;
  }
  if (!cfgOk) return bad("店家的綠界設定還沒完成，暫時無法結帳", 500);

  const client = await db().connect();
  try {
    await client.query("BEGIN");
    // 3. 從資料庫拿「現在的」價格與庫存，並鎖住這幾列，避免同時結帳搶到同一罐
    const ids = [...qty.keys()];
    const { rows: products } = await client.query(
      "SELECT id, name, price, stock FROM products WHERE id = ANY($1::int[]) FOR UPDATE",
      [ids]
    );
    if (products.length !== ids.length) {
      await client.query("ROLLBACK");
      return bad("有商品已經下架，請重新整理購物車");
    }
    for (const p of products) {
      const want = qty.get(p.id)!;
      if (p.stock < want) {
        await client.query("ROLLBACK");
        return bad(`「${p.name}」只剩 ${p.stock} 罐，請調整數量`, 409);
      }
    }

    // 4. 後端自己算錢
    const subtotal = products.reduce((s: number, p: { id: number; price: number }) => s + p.price * qty.get(p.id)!, 0);
    const shipping = shippingFor(subtotal);
    const total = subtotal + shipping;

    // 5. 客人：同一個 email 只存一筆，資料以最新一次為準
    const { rows: c } = await client.query(
      `INSERT INTO customers (name, email, phone, address) VALUES ($1,$2,$3,$4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, address = EXCLUDED.address
       RETURNING id`,
      [name, email, phone, address]
    );

    // 6. 訂單與明細（明細記下成交當下的單價）
    const tradeNo = newMerchantTradeNo();
    const token = crypto.randomBytes(24).toString("hex");
    const { rows: o } = await client.query(
      `INSERT INTO orders (customer_id, subtotal, shipping_fee, total, merchant_trade_no, access_token)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [c[0].id, subtotal, shipping, total, tradeNo, token]
    );
    const orderId: number = o[0].id;
    for (const p of products) {
      await client.query(
        "INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES ($1,$2,$3,$4,$5)",
        [orderId, p.id, p.name, p.price, qty.get(p.id)]
      );
    }
    await client.query("COMMIT");

    // 7. 準備交給綠界的付款表單（含檢查碼）
    const origin = siteOrigin(req.headers);
    const itemName =
      products.map((p: { id: number; name: string }) => `${p.name.replace(/#/g, "")} x ${qty.get(p.id)}`).join("#") +
      (shipping ? "#運費" : "");
    const ecpay = buildCheckoutFields({
      merchantTradeNo: tradeNo,
      total,
      itemName,
      returnURL: `${origin}/api/ecpay/notify`,
      clientBackURL: `${origin}/orders/${orderId}`,
    });

    const res = NextResponse.json({ orderId, total, ecpay });
    // 只有這台瀏覽器拿得到這把通行證，之後看訂單要靠它
    res.cookies.set(`order_${orderId}`, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https"),
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("建立訂單失敗", e);
    return bad("建立訂單時發生錯誤，請稍後再試", 500);
  } finally {
    client.release();
  }
}
