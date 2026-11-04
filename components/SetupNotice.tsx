// 資料庫還沒接好時顯示，告訴你下一步做什麼，而不是一整頁看不懂的錯誤
export default function SetupNotice({ reason }: { reason: "no-url" | "no-table" | "error" }) {
  return (
    <div className="notice warn" role="alert">
      <h2 style={{ fontSize: "1.15rem" }}>這間店還沒連上資料庫</h2>
      {reason === "no-url" && (
        <p>
          找不到 <code>DATABASE_URL</code>。本機請把 Neon 的連線字串貼進 <code>.env.local</code>；上線請到 Vercel 專案的
          Settings → Environment Variables 填入，再按 Redeploy。
        </p>
      )}
      {reason === "no-table" && (
        <p>
          已經連上資料庫，但還沒有資料表。請在終端機執行 <code>npm run db:setup</code>，建立資料表並放入範例商品。
        </p>
      )}
      {reason === "error" && (
        <p>
          連線失敗。最常見的原因是連線字串沒有貼完整，或前後多了空白。打開 <code>.env.local</code>（或 Vercel 的環境變數），整串重貼一次。
        </p>
      )}
    </div>
  );
}

export function dbErrorReason(e: unknown): "no-url" | "no-table" | "error" {
  const msg = String((e as Error)?.message ?? e);
  if (msg.includes("DATABASE_URL")) return "no-url";
  if ((e as { code?: string })?.code === "42P01" || msg.includes("does not exist")) return "no-table";
  return "error";
}
