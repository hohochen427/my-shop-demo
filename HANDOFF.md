# 交接說明（給下一位接手的 AI 或工程師）

最後更新：2026-11-08。這份只記「看程式看不出來」的事。規則以 `CLAUDE.md` 為準，這裡不重複。

## 先讀這三份

1. `CLAUDE.md`：店主規矩與「不准破壞的規則」（錢由後端算、秘密不進前端、付款通知冪等……）。
2. 本檔：網址、帳號位置、進行中的工作。
3. `docs/coupon/TASKS.md`：優惠碼施工進度。

## 三個網站

| 網站 | 網址 | 原始碼 | 怎麼上線 |
|---|---|---|---|
| 果醬商店 | https://my-shop-demo-bay.vercel.app | 本專案 `D:\my-shop` | push 到 GitHub `hohochen427/my-shop-demo` 的 `main`，Vercel 專案 `my-shop-demo`（team 3a-centercom）自動部署。**push 就等於正式上線。** |
| 3D 果醬島 | https://henhen-jan-island.netlify.app | `D:\jam-island`（**不是 Git 專案**） | 店主在 Netlify 專案 `henhen-jan-island` 的 Deploys 頁拖曳整個資料夾 |
| 教案「果醬島開店課」 | https://henhen-jam-lesson.netlify.app | 本專案 `docs/lesson/` | 見下方「教案」 |

商店頁首「回小島」的網址在 `lib/shop.ts` 的 `islandUrl`；小島連到商店的網址在 `D:\jam-island\content\jams.json` 的 `shopBaseUrl`。

## 秘密與 `.env.local`

- `.env.local` **只在店主的電腦上**，被 `.gitignore` 的 `.env*` 擋住，從來沒進過 Git。
- `.claude/settings.json` 禁止 AI 讀取或修改 `.env.local`。不要想辦法繞過，也不要用指令把內容印出來。
- 需要新的環境變數：只在 `.env.example` 加名稱和說明，告訴店主自己填。
- 每次 commit 前可以跑：`node scripts/check-env-secrets.mjs`（檢查 `.env.example` 沒有寫值、沒有 `.env` 檔被 Git 追蹤）。
- 正式站的環境變數在 Vercel 後台，由店主手動貼上；改完要 Redeploy 才生效。

## 資料庫（容易搞錯）

- 正式站用的是 **Neon 組織 hoho → 專案「my shop」（有空格）→ Branch「production」→ 資料庫 neondb**。
- Neon 組織「Vercel: 3a」裡有一個「my-shop」（有連字號），總覽頁寫著 backs your Vercel Production，但它是空的，**正式站沒有用它**。
- 本機 `.env.local` 連的是另一個資料庫，在本機跑過的 SQL 不代表正式站有。
- 分辨方法：用唯讀查詢比對商品庫存和 `/api/products` 的結果。
- 動正式資料庫、改 `scripts/schema.sql` 之前一律先問店主。改了資料表結構，要先在正式庫加好欄位才能 push，不然正式站會壞。

## 進行中的工作：優惠碼

- 需求、設計、施工計畫、驗收清單在 `docs/coupon/`（PRD、SDD、TASKS、CHECKLIST）。
- 依 `TASKS.md`（2026-11-08）：T00～T03 已完成，T04「綠界通知付款失敗時退回名額」起尚未開始。實際狀態以 `TASKS.md` 為準。
- 做法：一次只做一個 Task → 店主在預覽實際點過 → 檢查腳本通過 → 才 commit。

## 教案（docs/lesson/）

- `lesson.html`：原稿，**只改這個檔**。內容是拆解商店與小島的中學生教案，含翻翻卡、三張流程圖、提示詞範本。
- `build.mjs`：把原稿組成可上傳的網頁，執行 `node docs/lesson/build.mjs`，產出 `docs/lesson/site/`。
- `site/`：要上傳 Netlify 的整個資料夾（`index.html`＋`logo-rc.webp`，logo 從 `public/logo-rc.webp` 複製）。
- Netlify 專案名稱 `henhen-jam-lesson`，site id `c24442ae-fde7-4363-a877-2b6702d94c03`。
- 另有一份只有店主看得到的 Claude 版本：https://claude.ai/artifact/CpoMEtY7DvwF4ptJeRgws6 ，用 `node docs/lesson/build.mjs --artifact <輸出檔>` 產出後發布到同一網址。

上傳 Netlify 時遇到的狀況（這台 Windows 電腦）：

1. 沙盒禁止啟動 `cmd.exe`，所以 `npx ...` 會失敗（`EACCES spawn C:\Windows\system32\cmd.exe`）。
2. 解法：先用 Netlify 連接工具的 deploy-site 取得指令，再在 `docs/lesson/site` 資料夾裡，用 `node` 直接執行已下載的 `@netlify/mcp/dist/netlify-mcp.js`，參數照抄 `--site-id`、`--proxy-path`。檔案位置用 `find` 在 `npm-cache/_npx` 底下找 `@netlify/mcp/package.json`。
3. `--proxy-path` 的通行碼會過期，出現 `401 Unauthorized` 就重新取得。**通行碼不要寫進任何檔案或 commit。**
4. 上線、對外發布前要先問店主。

## 店主的工作習慣

- 店主不寫程式，請用繁體中文白話說明，技術名詞第一次出現要解釋。
- 動手前先說要改哪些檔案，等同意再做；一次一件事。
- commit 與 push 都要店主說可以；push 會直接讓正式站上線。
- 沒有實際檢查過的事，不可以說已經完成。
