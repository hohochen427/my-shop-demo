import { Pool } from "pg";

// 資料庫連線只存在後端。連線字串放在環境變數 DATABASE_URL，
// 名稱絕對不能加 NEXT_PUBLIC_，否則會被送到客人的瀏覽器。
const g = globalThis as unknown as { _shopPool?: Pool };

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function db(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL 尚未設定：本機請填在 .env.local，上線請填在 Vercel 的 Environment Variables。"
    );
  }
  if (!g._shopPool) {
    g._shopPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  }
  return g._shopPool;
}
