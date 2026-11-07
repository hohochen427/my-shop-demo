// 檢查每一頁頁首都有「回小島」按鈕，網址集中在 lib/shop.ts。按鈕被拿掉、網址改成寫死在頁面裡，這支會失敗。
// 用法（在 D:\my-shop）：node scripts/check-island-link.mjs
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const layout = read("app/layout.tsx");
const shop = read("lib/shop.ts");
const css = read("app/globals.css");
const errors = [];

if (!/islandUrl:\s*"https?:\/\/[^"]+"/.test(shop)) errors.push("lib/shop.ts 沒有 islandUrl（小島網址）");
if (!/href=\{SHOP\.islandUrl\}/.test(layout)) errors.push("頁首的回小島按鈕不見了，或網址沒有用 SHOP.islandUrl");
if (!/aria-label="回小島"/.test(layout)) errors.push("回小島按鈕少了 aria-label，手機只剩圖示時讀螢幕軟體念不出來");
if (/NEXT_PUBLIC_/.test(layout + shop)) errors.push("不可用 NEXT_PUBLIC_ 環境變數");
if (!/\.island-link\s*\{/.test(css)) errors.push("globals.css 少了 .island-link 樣式");

if (errors.length) { console.error("✖ 回小島按鈕檢查沒過：\n- " + errors.join("\n- ")); process.exit(1); }
console.log("✔ 回小島：頁首有按鈕、網址來自 lib/shop.ts、手機版有可讀名稱");
