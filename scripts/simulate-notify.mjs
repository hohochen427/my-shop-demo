// 開發用：在自己的電腦上，模擬「綠界通知付款成功」。
// 因為綠界連不到你電腦上的 localhost，本機測試付款流程時用這支。
// 用法：npm run simulate:paid -- 1001          （訂單編號）
//       npm run simulate:paid -- 1001 --twice  （同一筆通知送兩次，看系統會不會重複入帳）
import crypto from "node:crypto";
import pg from "pg";

const orderId = Number(process.argv[2]);
const twice = process.argv.includes("--twice");
const base = process.env.SIMULATE_BASE_URL || "http://localhost:3000";
const { DATABASE_URL, ECPAY_MERCHANT_ID, ECPAY_HASH_KEY, ECPAY_HASH_IV } = process.env;

if (!orderId) {
  console.error("請在後面加上訂單編號，例如：npm run simulate:paid -- 1001");
  process.exit(1);
}
if (!DATABASE_URL || !ECPAY_HASH_KEY || !ECPAY_HASH_IV || !ECPAY_MERCHANT_ID) {
  console.error("✖ .env.local 缺少 DATABASE_URL 或綠界的三個設定。");
  process.exit(1);
}

const enc = (s) => encodeURIComponent(s).replace(/%20/g, "+").replace(/'/g, "%27").replace(/~/g, "%7e").toLowerCase();
function mac(p) {
  const keys = Object.keys(p).sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0));
  const raw = `HashKey=${ECPAY_HASH_KEY}&` + keys.map((k) => `${k}=${p[k]}`).join("&") + `&HashIV=${ECPAY_HASH_IV}`;
  return crypto.createHash("sha256").update(enc(raw)).digest("hex").toUpperCase();
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
const { rows } = await client.query("SELECT merchant_trade_no, total FROM orders WHERE id = $1", [orderId]);
await client.end();
if (!rows[0]) {
  console.error(`✖ 找不到訂單 ${orderId}`);
  process.exit(1);
}

const params = {
  MerchantID: ECPAY_MERCHANT_ID,
  MerchantTradeNo: rows[0].merchant_trade_no,
  RtnCode: "1",
  RtnMsg: "交易成功",
  TradeNo: "SIM" + Date.now(),
  TradeAmt: String(rows[0].total),
  PaymentDate: new Date().toISOString().slice(0, 19).replace("T", " ").replace(/-/g, "/"),
  PaymentType: "Credit_CreditCard",
  PaymentTypeChargeFee: "0",
  TradeDate: new Date().toISOString().slice(0, 19).replace("T", " ").replace(/-/g, "/"),
  SimulatePaid: "1",
  StoreID: "",
  CustomField1: "", CustomField2: "", CustomField3: "", CustomField4: "",
};
params.CheckMacValue = mac(params);

for (let i = 1; i <= (twice ? 2 : 1); i++) {
  const res = await fetch(`${base}/api/ecpay/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  console.log(`第 ${i} 次通知 → ${res.status} ${await res.text()}`);
}
console.log(`打開 ${base}/admin 看看訂單 ${orderId} 的狀態和營收。`);
