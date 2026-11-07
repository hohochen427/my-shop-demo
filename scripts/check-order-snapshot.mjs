// 回歸檢查：同一個 Email 下第二張單、填了不同的地址，第一張訂單的收件資料不可以跟著變。
// 收件資料被覆蓋（問題還在），這支就會失敗。
//
// 會寫入資料庫，每次執行前要先確認：
//   - 建立 2 張待付款的測試訂單（客人「CHK 收件檢查」、chk-snapshot@example.com）
//   - 不會扣庫存，也不會算進後台營收（沒有付款）
// 網站要開著（npm run dev），而且要先跑過 npm run db:setup。
// 用法：npm run check:snapshot
import pg from "pg";

const base = process.env.SIMULATE_BASE_URL || "http://localhost:3000";
if (!process.env.DATABASE_URL) {
  console.error("✖ .env.local 缺少 DATABASE_URL。");
  process.exit(1);
}

const EMAIL = "chk-snapshot@example.com";
let failed = false;
function check(cond, msg) {
  console.log(`${cond ? "✔" : "✖"} ${msg}`);
  if (!cond) failed = true;
}

async function placeOrder(productId, customer) {
  const res = await fetch(`${base}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ productId, quantity: 1 }], customer: { email: EMAIL, ...customer } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`訂單建立失敗：${res.status} ${data.error}`);
  return data.orderId;
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const { rows: ps } = await client.query("SELECT id FROM products WHERE stock > 0 ORDER BY id LIMIT 1");
  if (!ps[0]) throw new Error("找不到有庫存的商品，無法下測試單");
  const productId = ps[0].id;

  const first = { name: "CHK 收件檢查 第一張", phone: "0900000001", address: "第一張的地址（測試用，不出貨）" };
  const second = { name: "CHK 收件檢查 第二張", phone: "0900000002", address: "第二張的地址（測試用，不出貨）" };
  const id1 = await placeOrder(productId, first);
  const id2 = await placeOrder(productId, second);
  console.log(`已建立測試訂單 #${id1}、#${id2}`);

  // 用跟後台一樣的方式讀收件資料：訂單上有存就用訂單的，沒有才退回客人表
  const q = `SELECT COALESCE(o.ship_name, c.name) AS name, COALESCE(o.ship_phone, c.phone) AS phone,
                    COALESCE(o.ship_address, c.address) AS address, o.ship_address IS NOT NULL AS saved
             FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = $1`;
  const a = (await client.query(q, [id1])).rows[0];
  const b = (await client.query(q, [id2])).rows[0];

  check(a.saved && b.saved, "兩張訂單都有存下自己的收件資料");
  check(a.name === first.name && a.phone === first.phone && a.address === first.address, `第一張 #${id1} 的收件資料沒有被第二張蓋掉`);
  check(b.name === second.name && b.phone === second.phone && b.address === second.address, `第二張 #${id2} 的收件資料正確`);
} catch (e) {
  console.error("✖ 檢查無法完成：", e.message);
  failed = true;
} finally {
  await client.end().catch(() => {});
}

if (failed) {
  console.error("✖ 收件資料檢查失敗");
  process.exit(1);
}
console.log("✔ 收件資料檢查通過");
