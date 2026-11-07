// 檢查商品照片跟商品對得上：每款範例商品（scripts/db-setup.mjs 的 SAMPLE）
// 都要有 public/jams/jam-<slug>.jpg，而且 JarArt 的照片清單、首頁／商品頁／購物車都要用 slug 找圖。
// 圖檔改名、少一張、或某一頁忘了傳 slug（會退回畫的果醬罐），這支就會失敗。
// 用法（在 D:\my-shop）：node scripts/check-jam-photos.mjs
import { readFileSync, existsSync } from "node:fs";

const at = (p) => new URL(`../${p}`, import.meta.url);
const read = (p) => readFileSync(at(p), "utf8");
const errors = [];

const setup = read("scripts/db-setup.mjs");
const products = [...setup.matchAll(/\["([a-z-]+)", "([^"]+)"/g)].map((m) => ({ slug: m[1], name: m[2] }));
if (products.length === 0) errors.push("讀不到 db-setup.mjs 的商品清單");

const jarArt = read("components/JarArt.tsx");
const listed = new Set([...(jarArt.match(/JAM_PHOTOS = new Set\(\[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([a-z-]+)"/g)].map((m) => m[1]));
if (!/src=\{`\/jams\/jam-\$\{slug\}\.jpg`\}/.test(jarArt)) errors.push("JarArt 的圖片路徑不是 /jams/jam-<slug>.jpg");

for (const { slug, name } of products) {
  if (!listed.has(slug)) errors.push(`${name}（${slug}）不在 JarArt 的 JAM_PHOTOS 清單`);
  if (!existsSync(at(`public/jams/jam-${slug}.jpg`))) errors.push(`${name}（${slug}）缺少 public/jams/jam-${slug}.jpg`);
}
for (const slug of listed) {
  if (!products.some((p) => p.slug === slug)) errors.push(`JAM_PHOTOS 有 ${slug}，但商品清單沒有這款`);
}

for (const f of ["app/page.tsx", "app/products/[slug]/page.tsx", "components/CartView.tsx"]) {
  const src = read(f);
  for (const tag of src.match(/<JarArt[^>]*\/>/g) ?? []) {
    if (!/slug=\{p\.slug\}/.test(tag)) errors.push(`${f} 的 <JarArt> 沒有傳 slug，會顯示畫的果醬罐而不是照片`);
  }
}
if (!/AI 示意圖/.test(read("app/products/[slug]/page.tsx"))) errors.push("商品頁少了「AI 示意圖」標示");

if (errors.length) { console.error("✖ 商品照片檢查沒過：\n- " + errors.join("\n- ")); process.exit(1); }
console.log(`✔ 商品照片：${products.length} 款商品都有對應的 jam-<slug>.jpg，三個頁面都用 slug 找圖，商品頁有 AI 示意圖標示`);
