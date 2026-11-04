import type { Metadata } from "next";
import SetupNotice, { dbErrorReason } from "@/components/SetupNotice";
import { db } from "@/lib/db";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { ALLOWED_NEXT, ORDER_STATUS, PAYMENT_STATUS } from "@/lib/orders";
import { SHOP, formatNT } from "@/lib/shop";
import { changeStatus, clearReview, login, logout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `店家後台｜${SHOP.name}`, robots: { index: false } };

type Row = {
  id: number; status: string; payment_status: string; total: number; review_note: string | null;
  created_at: Date; name: string; email: string; items: string;
};

export default async function Admin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  if (!adminEnabled()) {
    return (
      <div className="section">
        <h1>店家後台</h1>
        <p className="notice warn">還沒設定後台密碼。請在 <code>.env.local</code>（本機）或 Vercel 的環境變數加上 <code>ADMIN_PASSWORD</code>。</p>
      </div>
    );
  }

  if (!(await isAdmin())) {
    return (
      <div className="section" style={{ maxWidth: 420 }}>
        <h1>店家後台</h1>
        <form action={login} className="panel">
          <div className="field">
            <label htmlFor="password">後台密碼</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {error && <p className="notice err" role="alert">密碼不對，再試一次。</p>}
          <button className="btn" type="submit">登入</button>
        </form>
      </div>
    );
  }

  let orders: Row[] = [];
  let revenue = 0;
  let paidCount = 0;
  try {
    // 營收：只算已付款的訂單，金額用訂單明細裡的「成交單價」，不是商品現在的價格
    const r = await db().query(`
      SELECT COALESCE(SUM(oi.unit_price * oi.quantity), 0)::int AS revenue, COUNT(DISTINCT o.id)::int AS n
      FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'`);
    revenue = r.rows[0].revenue;
    paidCount = r.rows[0].n;
    orders = (await db().query(`
      SELECT o.id, o.status, o.payment_status, o.total, o.review_note, o.created_at, c.name, c.email,
             string_agg(oi.product_name || ' × ' || oi.quantity, '、' ORDER BY oi.id) AS items
      FROM orders o JOIN customers c ON c.id = o.customer_id JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id, c.name, c.email ORDER BY o.id DESC LIMIT 100`)).rows;
  } catch (e) {
    return <SetupNotice reason={dbErrorReason(e)} />;
  }

  const review = orders.filter((o) => o.review_note);
  const label: Record<string, string> = { cancelled: "取消訂單", shipped: "標記已出貨", completed: "標記已完成" };

  return (
    <div className="section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>店家後台</h1>
        <form action={logout}><button className="btn ghost" type="submit">登出</button></form>
      </div>

      <div className="stats">
        <div className="stat"><span className="hint">商品營收（不含運費）</span><b>{formatNT(revenue)}</b></div>
        <div className="stat"><span className="hint">已付款訂單</span><b>{paidCount} 張</b></div>
        <div className="stat"><span className="hint">全部訂單</span><b>{orders.length} 張</b></div>
      </div>

      {review.length > 0 && (
        <section className="notice warn" aria-labelledby="review-h">
          <h2 id="review-h" style={{ fontSize: "1.1rem" }}>需要人工處理</h2>
          {review.map((o) => (
            <form key={o.id} action={clearReview} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "6px 0" }}>
              <span>訂單 #{o.id}：{o.review_note}</span>
              <input type="hidden" name="orderId" value={o.id} />
              <button className="btn ghost" type="submit">已處理</button>
            </form>
          ))}
        </section>
      )}

      <h2 style={{ fontSize: "1.2rem" }}>訂單</h2>
      {orders.length === 0 ? (
        <p>還沒有訂單。</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th scope="col">編號</th><th scope="col">客人</th><th scope="col">商品</th><th scope="col">金額</th><th scope="col">付款</th><th scope="col">訂單狀態</th><th scope="col">下一步</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}<br /><span className="hint">{new Date(o.created_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</span></td>
                  <td>{o.name}<br /><span className="hint">{o.email}</span></td>
                  <td>{o.items}</td>
                  <td className="nowrap">{formatNT(o.total)}</td>
                  <td><span className={`badge ${o.payment_status}`}>{PAYMENT_STATUS[o.payment_status]}</span></td>
                  <td><span className={`badge ${o.status}`}>{ORDER_STATUS[o.status]}</span></td>
                  <td>
                    {(ALLOWED_NEXT[o.status] ?? [])
                      .filter((to) => !(to === "cancelled" && o.payment_status === "paid"))
                      .map((to) => (
                        <form key={to} action={changeStatus}>
                          <input type="hidden" name="orderId" value={o.id} />
                          <input type="hidden" name="to" value={to} />
                          <button className="btn ghost" type="submit">{label[to]}</button>
                        </form>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
