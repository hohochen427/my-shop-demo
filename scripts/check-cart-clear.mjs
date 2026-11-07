// 檢查購物車有「清空購物車」，而且要先確認才清空。按鈕被拿掉或改成一按就清空，這支會失敗。
// 用法（在 D:\my-shop）：node scripts/check-cart-clear.mjs
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../components/CartView.tsx", import.meta.url), "utf8");
const errors = [];
if (!/>\s*清空購物車\s*</.test(src)) errors.push("購物車頁沒有「清空購物車」按鈕");
if (!/確定要清空購物車嗎/.test(src)) errors.push("清空前沒有先確認");
if (!/setConfirmClear\(false\);\s*update\(\[\]\)/.test(src)) errors.push("確認後沒有用 update([]) 清空（要同時清掉畫面、瀏覽器記錄和已套用的優惠碼）");
if (/onClick=\{\(\)\s*=>\s*update\(\[\]\)\}/.test(src)) errors.push("有按鈕一按就清空，沒經過確認");

if (errors.length) { console.error("✖ 清空購物車檢查沒過：\n- " + errors.join("\n- ")); process.exit(1); }
console.log("✔ 清空購物車：有按鈕、先確認、確認後才清空");
