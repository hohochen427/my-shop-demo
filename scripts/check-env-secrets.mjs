// 檢查秘密不會被推上 GitHub。用法（在 D:\my-shop）：node scripts/check-env-secrets.mjs
// .env.local 只放本機；.env.example 只能有名稱和說明，不能有值（ECPAY_MODE=stage 例外，它不是秘密）。
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const errors = [];

// 1. .env.example 只能寫名稱
const example = readFileSync(new URL(".env.example", root), "utf8");
for (const [i, line] of example.split(/\r?\n/).entries()) {
  if (/^\s*(#|$)/.test(line)) continue;
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (!m) { errors.push(`.env.example 第 ${i + 1} 行格式不是「名稱=」`); continue; }
  const [, name, value] = m;
  if (name === "ECPAY_MODE" && value.trim() === "stage") continue;
  if (value.trim() !== "") errors.push(`.env.example 的 ${name} 寫了值，這個檔案會上傳到 GitHub，只能留空`);
}

// 2. 除了 .env.example，任何 .env 檔都不能被 Git 追蹤
const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n");
for (const f of tracked) if (/(^|\/)\.env/.test(f) && !/(^|\/)\.env\.example$/.test(f)) errors.push(`${f} 被加進 Git 了，秘密檔只能留在本機`);

// 3. .gitignore 要擋住 .env 開頭的檔案
try {
  execFileSync("git", ["check-ignore", "-q", ".env.local"], { cwd: root, stdio: "ignore" });
} catch {
  errors.push(".gitignore 沒有擋住 .env.local，請保留「.env*」和「!.env.example」兩行");
}

if (errors.length) { console.error("✖ 秘密檢查沒過：\n- " + errors.join("\n- ")); process.exit(1); }
console.log("✔ 秘密檢查：.env.example 只有名稱、沒有 .env 檔被 Git 追蹤、.env.local 只在本機");
