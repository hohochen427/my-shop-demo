import crypto from "crypto";

// 綠界全方位金流（AIO）。金鑰只從環境變數讀，這個檔案只在後端執行。
const ENDPOINT = {
  stage: "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
  production: "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5",
};

export function ecpayConfig() {
  const merchantId = process.env.ECPAY_MERCHANT_ID;
  const hashKey = process.env.ECPAY_HASH_KEY;
  const hashIV = process.env.ECPAY_HASH_IV;
  if (!merchantId || !hashKey || !hashIV) {
    throw new Error("綠界設定不完整：請確認 ECPAY_MERCHANT_ID、ECPAY_HASH_KEY、ECPAY_HASH_IV 三個環境變數都有填。");
  }
  const mode = process.env.ECPAY_MODE === "production" ? "production" : "stage";
  return { merchantId, hashKey, hashIV, mode, endpoint: ENDPOINT[mode] };
}

// 綠界規定的網址編碼方式（與 .NET 的 UrlEncode 相同）
function ecpayEncode(s: string): string {
  return encodeURIComponent(s)
    .replace(/%20/g, "+")
    .replace(/'/g, "%27")
    .replace(/~/g, "%7e")
    .toLowerCase();
}

// 檢查碼：雙方各用金鑰算一次，對得上才代表資料沒被竄改
export function checkMacValue(params: Record<string, string>, hashKey: string, hashIV: string): string {
  const keys = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .sort((a, b) => {
      const x = a.toLowerCase();
      const y = b.toLowerCase();
      return x < y ? -1 : x > y ? 1 : 0;
    });
  const raw = `HashKey=${hashKey}&` + keys.map((k) => `${k}=${params[k]}`).join("&") + `&HashIV=${hashIV}`;
  return crypto.createHash("sha256").update(ecpayEncode(raw)).digest("hex").toUpperCase();
}

export function verifyCheckMacValue(params: Record<string, string>, hashKey: string, hashIV: string): boolean {
  const got = Buffer.from(String(params.CheckMacValue || "").toUpperCase());
  const expected = Buffer.from(checkMacValue(params, hashKey, hashIV));
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

// 綠界要的是台灣時間，伺服器（例如 Vercel）通常是 UTC，所以要指定時區
function taipeiParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Taipei",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { Y: get("year"), M: get("month"), D: get("day"), h: get("hour").replace("24", "00"), m: get("minute"), s: get("second") };
}

export function tradeDate(d = new Date()): string {
  const p = taipeiParts(d);
  return `${p.Y}/${p.M}/${p.D} ${p.h}:${p.m}:${p.s}`;
}

// 綠界測試環境是所有開發者共用的，交易編號要夠獨特，不然會撞號
export function newMerchantTradeNo(d = new Date()): string {
  const p = taipeiParts(d);
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
  return `JS${p.Y.slice(2)}${p.M}${p.D}${p.h}${p.m}${p.s}${rand}`; // 18 碼
}

export function buildCheckoutFields(input: {
  merchantTradeNo: string;
  total: number;
  itemName: string;
  returnURL: string;
  clientBackURL: string;
}) {
  const cfg = ecpayConfig();
  const fields: Record<string, string> = {
    MerchantID: cfg.merchantId,
    MerchantTradeNo: input.merchantTradeNo,
    MerchantTradeDate: tradeDate(),
    PaymentType: "aio",
    TotalAmount: String(input.total),
    TradeDesc: "小店訂單",
    ItemName: input.itemName.slice(0, 380),
    ReturnURL: input.returnURL,
    ClientBackURL: input.clientBackURL,
    ChoosePayment: "Credit",
    EncryptType: "1",
  };
  fields.CheckMacValue = checkMacValue(fields, cfg.hashKey, cfg.hashIV);
  return { action: cfg.endpoint, fields };
}
