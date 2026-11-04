import crypto from "crypto";
import Link from "next/link";
import { cookies } from "next/headers";
import SetupNotice, { dbErrorReason } from "@/components/SetupNotice";
import { db } from "@/lib/db";
import { ORDER_STATUS, PAYMENT_STATUS, STATUS_FLOW } from "@/lib/orders";
import { formatNT } from "@/lib/shop";

export const dynamic = "force-dynamic";

type Item = { product_name: string; unit_price: number; quantity: number };

function sameToken(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// 看訂單之前，後端問兩題：你有通行證嗎？這張訂單是你的嗎？
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);
  const token = (await cookies()).get(`order_${orderId}`)?.value;

  if (!Number.isInteger(orderId) || !token) {
    return (
      <div className="section">
        <h1>看不到這張訂單</h1>
        <p>訂單只能在下單的那個瀏覽器查看。如果你是店家，請到 <Link href="/admin">店家後台</Link>。</p>
      </div>
    );
  }

  let order;
  let items: Item[] = [];
  try {
    const { rows } = await db().query(
      "SELECT id, status, payment_status, subtotal, shipping_fee, total, access_token, created_at FROM orders WHERE id = $1",
      [orderId]
    );
    order = rows[0];
    if (order && sameToken(order.access_token, token)) {
      items = (await db().query("SELECT product_name, unit_price, quantity FROM order_items WHERE order_id = $1 ORDER BY id", [orderId])).rows;
    }
  } catch (e) {
    return <SetupNotice reason={dbErrorReason(e)} />;
  }

  if (!order || !sameToken(order.access_token, token)) {
    return (
      <div className="section">
        <h1>看不到這張訂單</h1>
        <p>這張訂單不是用這個瀏覽器下的，所以不能查看。</p>
      </div>
    );
  }

  const stepIndex = STATUS_FLOW.indexOf(order.status);
  return (
    <div className="section">
      <h1>訂單 #{order.id}</h1>
      <p>
        付款狀態　<span className={`badge ${order.payment_status}`}>{PAYMENT_STATUS[order.payment_status]}</span>
      </p>
      {order.status === "cancelled" ? (
        <p className="notice err">這張訂單已取消。</p>
      ) : (
        <ol className="steps" aria-label="訂單進度">
          {STATUS_FLOW.map((s, i) => (
            <li key={s} className={i < stepIndex ? "done" : i === stepIndex ? "now" : ""} aria-current={i === stepIndex ? "step" : undefined}>
              {ORDER_STATUS[s]}
            </li>
          ))}
        </ol>
      )}
      {order.payment_status === "unpaid" && (
        <p className="notice warn">
          還沒收到綠界的付款通知。剛付完款的話，等幾秒後重新整理這一頁。（在自己電腦上測試時，綠界通知不到 localhost，這一步要上線後才會自動更新。）
        </p>
      )}
      <div className="table-scroll" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th scope="col">商品</th><th scope="col">單價</th><th scope="col">數量</th><th scope="col">小計</th></tr></thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}><td>{it.product_name}</td><td>{formatNT(it.unit_price)}</td><td>{it.quantity}</td><td>{formatNT(it.unit_price * it.quantity)}</td></tr>
            ))}
            <tr><td colSpan={3}>運費</td><td>{order.shipping_fee ? formatNT(order.shipping_fee) : "免運"}</td></tr>
            <tr><th scope="row" colSpan={3}>總金額</th><td><b>{formatNT(order.total)}</b></td></tr>
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 24 }}><Link href="/">繼續逛逛</Link></p>
    </div>
  );
}
