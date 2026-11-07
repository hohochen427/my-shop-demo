// 回歸檢查：優惠碼名額退回。
// 自動走一遍「用碼下單 → 付款失敗 → 同一個 Email 再用 → 後台取消 → 同一個 Email 再用」。
// 退回名額的邏輯（T03 取消時退回、T04 付款失敗時退回）沒做好，這支就會失敗。
//
// 會寫入資料庫，每次執行前要先確認：
//   - 建立 1 個 CHK- 開頭的測試碼（每個 Email 限用 1 次、折 1 元），結束時停用，不刪除
//   - 建立 2～3 張測試訂單（客人「CHK 名額檢查」、chk-coupon-…@example.com），其中一張會被取消
// 「後台取消」照店家的方式操作：用 ADMIN_PASSWORD 在本機算出後台通行證，送出後台頁面上的「取消訂單」表單。
//   密碼和通行證只在這支程式裡用，不會印出來。
// 網站要開著（npm run dev）。
// 用法：npm run check:coupons
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import pg from "pg";

const base = process.env.SIMULATE_BASE_URL || "http://localhost:3000";
if (!process.env.DATABASE_URL) {
  console.error("✖ .env.local 缺少 DATABASE_URL。");
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD) {
  console.error("✖ .env.local 缺少 ADMIN_PASSWORD，沒辦法操作後台取消訂單。");
  process.exit(1);
}
if (process.env.ECPAY_MODE === "production") {
  console.error("✖ 綠界是正式模式，模擬付款會被忽略，這支檢查不能在正式模式跑。");
  process.exit(1);
}

let failed = false;
function check(cond, okMsg, badMsg = okMsg) {
  console.log(cond ? `✔ ${okMsg}` : `✖ ${badMsg}`);
  if (!cond) failed = true;
}

const stamp = Date.now().toString(36).toUpperCase();
const code = `CHK-${stamp}`;
const email = `chk-coupon-${stamp.toLowerCase()}@example.com`;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

async function placeOrder(productId, n) {
  const res = await fetch(`${base}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId, quantity: 1 }],
      customer: { name: `CHK 名額檢查 ${n}`, email, phone: "0900000000", address: "測試用，不出貨" },
      coupon: code,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, id: data.orderId, error: data.error ?? `HTTP ${res.status}` };
}

// 用現成的模擬付款腳本，跟店主平常測試走同一條路
function payFail(orderId) {
  execFileSync(process.execPath, ["scripts/simulate-notify.mjs", String(orderId), "--fail"], { stdio: "inherit", env: process.env });
}

// 照店家的方式在後台按「取消訂單」：打開 /admin，找到這張訂單的取消表單，原樣送出
const adminCookie =
  "admin_session=" + crypto.createHmac("sha256", process.env.ADMIN_PASSWORD).update("jam-shop-admin").digest("hex");
async function cancelInAdmin(orderId) {
  const page = await fetch(`${base}/admin`, { headers: { cookie: adminCookie } });
  const html = await page.text();
  const m = html.match(
    new RegExp(
      `name="\\$ACTION_ID_([0-9a-f]+)"/><input type="hidden" name="orderId" value="${orderId}"/><input type="hidden" name="to" value="cancelled"/>`
    )
  );
  if (!m) throw new Error(`後台找不到訂單 #${orderId} 的「取消訂單」按鈕`);
  const form = new FormData();
  form.append(`$ACTION_ID_${m[1]}`, "");
  form.append("orderId", String(orderId));
  form.append("to", "cancelled");
  await fetch(`${base}/admin`, { method: "POST", headers: { cookie: adminCookie, Origin: base }, body: form, redirect: "manual" });
}

async function orderRow(orderId) {
  const { rows } = await client.query("SELECT status, payment_status FROM orders WHERE id = $1", [orderId]);
  return rows[0] ?? {};
}

try {
  const { rows: found } = await client.query("SELECT id, name FROM products WHERE stock > 0 ORDER BY id LIMIT 1");
  if (!found[0]) throw new Error("資料庫裡沒有有庫存的商品，請先跑 npm run db:setup");
  const product = found[0];

  await client.query(
    `INSERT INTO coupons (code, kind, value, min_subtotal, starts_at, per_email_limit, active)
     VALUES ($1, 'fixed', 1, 0, now() - interval '1 minute', 1, true)`,
    [code]
  );
  console.log(`建立測試碼 ${code}（每個 Email 限用 1 次），用「${product.name}」、${email} 測試。`);

  // 1. 第一次用碼下單
  const a = await placeOrder(product.id, 1);
  check(a.ok, `第一次用碼下單成功（訂單 #${a.id}）`, `第一次用碼下單就失敗：${a.error}`);
  if (!a.ok) throw new Error("第一步就失敗，後面無法檢查");

  // 2. 付款失敗
  payFail(a.id);
  const ra = await orderRow(a.id);
  check(ra.payment_status === "failed", `訂單 #${a.id} 付款狀態變成「付款失敗」`, `訂單 #${a.id} 付款狀態是 ${ra.payment_status}，不是付款失敗`);

  // 3. 付款失敗後，同一個 Email 應該能再用（T04）
  const b = await placeOrder(product.id, 2);
  check(
    b.ok,
    `付款失敗後，同一個 Email 可以再次使用（訂單 #${b.id}）`,
    `付款失敗後，同一個 Email 無法再次使用（後端回：${b.error}）`
  );

  // 4. 在後台取消一張用了碼、還沒付款的訂單（第 3 步成功就取消那張，否則取消第 1 張）
  const target = b.ok ? b.id : a.id;
  await cancelInAdmin(target);
  const rt = await orderRow(target);
  check(rt.status === "cancelled", `後台取消訂單 #${target} 成功`, `後台取消訂單 #${target} 失敗，狀態是 ${rt.status}`);

  // 5. 取消後，同一個 Email 應該能再用（T03）
  const c = await placeOrder(product.id, 3);
  check(
    c.ok,
    `取消訂單後，同一個 Email 可以再次使用（訂單 #${c.id}）`,
    `取消訂單後，同一個 Email 無法再次使用（後端回：${c.error}）`
  );
} catch (e) {
  console.error("✖ 檢查途中出錯：", e.message);
  failed = true;
} finally {
  await client.query("UPDATE coupons SET active = false WHERE code = $1", [code]).catch(() => {});
  console.log(`測試碼 ${code} 已停用（沒有刪除）。`);
  await client.end();
}

console.log(failed ? "結果：失敗" : "結果：全部通過");
process.exit(failed ? 1 : 0);
