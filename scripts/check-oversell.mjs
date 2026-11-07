// 回歸檢查：兩個人先後下單搶最後 1 罐，兩人都付款成功時，店家一定要在後台看到「庫存不足」提醒。
// 提醒沒出現（問題還在），這支就會失敗。
//
// 會寫入資料庫，每次執行前要先確認：
//   - 暫時把第一個商品的庫存改成 1，結束時改回原本的數字
//   - 建立 2 張已付款的測試訂單（客人「CHK 超賣檢查」、chk-oversell@example.com），後台營收會因此增加
// 網站要開著（npm run dev）。
// 用法：node --env-file-if-exists=.env.local scripts/check-oversell.mjs
import { execFileSync } from "node:child_process";
import pg from "pg";

const base = process.env.SIMULATE_BASE_URL || "http://localhost:3000";
if (!process.env.DATABASE_URL) {
  console.error("✖ .env.local 缺少 DATABASE_URL。");
  process.exit(1);
}
if (process.env.ECPAY_MODE === "production") {
  console.error("✖ 綠界是正式模式，模擬付款會被忽略，這支檢查不能在正式模式跑。");
  process.exit(1);
}

let failed = false;
function check(cond, msg) {
  console.log(`${cond ? "✔" : "✖"} ${msg}`);
  if (!cond) failed = true;
}

async function placeOrder(productId, n) {
  const res = await fetch(`${base}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId, quantity: 1 }],
      customer: { name: `CHK 超賣檢查 ${n}`, email: "chk-oversell@example.com", phone: "0900000000", address: "測試用，不出貨" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`第 ${n} 張訂單建立失敗：${res.status} ${data.error}`);
  return data.orderId;
}

// 用現成的模擬付款腳本，跟店主平常測試走同一條路
function pay(orderId, ...flags) {
  execFileSync(process.execPath, ["scripts/simulate-notify.mjs", String(orderId), ...flags], { stdio: "inherit", env: process.env });
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: found } = await client.query("SELECT id, name, stock FROM products ORDER BY id LIMIT 1");
if (!found[0]) {
  console.error("✖ 資料庫裡沒有商品，請先跑 npm run db:setup");
  await client.end();
  process.exit(1);
}
const product = found[0];
const original = product.stock;
console.log(`用「${product.name}」測試，原本庫存 ${original} 罐，暫時改成 1 罐。`);

try {
  await client.query("UPDATE products SET stock = 1 WHERE id = $1", [product.id]);

  // 1. 兩個人先後下單：這時庫存都還是 1，兩張都會成立
  const a = await placeOrder(product.id, 1);
  const b = await placeOrder(product.id, 2);
  console.log(`建立測試訂單 #${a}、#${b}`);

  // 2. 兩人都付款成功；第二張的通知送兩次，確認提醒不會重複
  pay(a);
  pay(b, "--twice");

  // 3. 檢查結果
  const { rows } = await client.query(
    "SELECT id, payment_status, review_note FROM orders WHERE id = ANY($1::int[]) ORDER BY id",
    [[a, b]]
  );
  const [ra, rb] = rows;
  check(ra.payment_status === "paid" && rb.payment_status === "paid", "兩張訂單都標成已付款（錢確實收到了）");
  check(!ra.review_note, `第一張 #${a} 庫存夠，沒有人工處理提醒`);
  const notes = (rb.review_note ?? "").split("庫存不足").length - 1;
  check(notes >= 1, `第二張 #${b} 出現「庫存不足」提醒（目前內容：${rb.review_note ?? "空的"}）`);
  check(notes <= 1, `第二張 #${b} 的通知送兩次，提醒只出現一次`);

  const { rows: s } = await client.query("SELECT stock FROM products WHERE id = $1", [product.id]);
  check(s[0].stock === 0, `庫存扣到 0，沒有變成負數（目前 ${s[0].stock}）`);
} catch (e) {
  console.error("✖ 檢查途中出錯：", e.message);
  failed = true;
} finally {
  await client.query("UPDATE products SET stock = $2 WHERE id = $1", [product.id, original]);
  console.log(`「${product.name}」庫存已改回 ${original} 罐。`);
  await client.end();
}

console.log(failed ? "結果：失敗" : "結果：全部通過");
process.exit(failed ? 1 : 0);
