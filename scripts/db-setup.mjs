// 建立資料表並放入範例商品。重複執行不會重複放商品。
// 用法：npm run db:setup
import { readFileSync } from "node:fs";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("✖ 找不到 DATABASE_URL。請先把 Neon 連線字串貼進 .env.local 的 DATABASE_URL= 後面。");
  process.exit(1);
}

const SAMPLE = [
  ["strawberry", "大湖草莓果醬", "苗栗大湖的冬季草莓，保留果粒，酸甜明亮。", 320, 30, "#B91C1C"],
  ["mango-passion", "芒果百香果醬", "愛文芒果配上百香果籽，夏天的味道。", 340, 24, "#C2410C"],
  ["blueberry", "藍莓果醬", "整顆藍莓慢熬，抹吐司或配優格都好。", 360, 18, "#3730A3"],
  ["pomelo-lemon", "柚香檸檬果醬", "文旦皮加檸檬，帶一點微苦的清香。", 300, 12, "#A16207"],
  ["roselle", "洛神花果醬", "台東洛神花，顏色像寶石，酸度最高的一款。", 300, 20, "#9D174D"],
  ["fig", "無花果果醬", "小量試做，每批只有幾罐。", 420, 2, "#6B3A1E"],
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
  await client.query(sql);
  console.log("✔ 資料表已建立：products、customers、orders、order_items、payments");
  const { rows } = await client.query("SELECT count(*)::int AS n FROM products");
  if (rows[0].n === 0) {
    for (const p of SAMPLE) {
      await client.query(
        "INSERT INTO products (slug, name, description, price, stock, color) VALUES ($1,$2,$3,$4,$5,$6)",
        p
      );
    }
    console.log(`✔ 已放入 ${SAMPLE.length} 款範例商品`);
  } else {
    console.log(`✔ 商品表已有 ${rows[0].n} 筆資料，不重複放入範例商品`);
  }
} catch (e) {
  console.error("✖ 資料庫設定失敗：", e.message);
  console.error("  請確認 DATABASE_URL 是完整的一整串，前後沒有多餘的空白。");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
