// 檢查頁首：只放店主的 RC logo、不放店名文字（2026-11-07 店主決定），
// logo 的 alt 要寫出店名讓螢幕報讀念得出來，頁首也要有「關於我們」連結。
// 用法（在 D:\my-shop）：node scripts/check-logo.mjs
import { readFileSync, existsSync } from "node:fs";

const at = (p) => new URL(`../${p}`, import.meta.url);
const layout = readFileSync(at("app/layout.tsx"), "utf8");
const css = readFileSync(at("app/globals.css"), "utf8");
const errors = [];

if (!existsSync(at("public/logo-rc.webp"))) errors.push("public/logo-rc.webp 不存在");
const brand = layout.match(/<Link href="\/" className="brand">([\s\S]*?)<\/Link>/)?.[1] ?? "";
if (!/src="\/logo-rc\.webp"/.test(brand)) errors.push("頁首首頁連結裡少了 RC logo");
if (!/alt="HenHen日初[^"]*"/.test(brand)) errors.push("logo 的 alt 要寫店名（HenHen日初），頁首沒有店名文字，螢幕報讀只能靠它");
if (/\{SHOP\.name\}/.test(brand)) errors.push("頁首只放 logo，不要再放店名文字");
if (!/\.brand-logo\s*\{[^}]*height/.test(css)) errors.push("globals.css 少了 .brand-logo 的高度");
if (!/<Link href="\/about"[^>]*>關於我們<\/Link>/.test(layout)) errors.push("頁首少了「關於我們」連結");
if (!existsSync(at("app/about/page.tsx"))) errors.push("app/about/page.tsx 不存在");

if (errors.length) { console.error("✖ 頁首檢查沒過：\n- " + errors.join("\n- ")); process.exit(1); }
console.log("✔ 頁首：只放 RC logo（alt 有店名）、有「關於我們」、圖檔存在");
