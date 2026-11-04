# 小島果醬：給 Claude Code 的工作規則

這是一間用 Next.js（App Router）、Neon（PostgreSQL，透過 `pg` 套件連線）、Vercel、綠界測試環境做的示範商店。使用者是不會寫程式的店主，請用繁體中文、白話回答，技術名詞第一次出現時用一句話解釋。

## 動手前

- 先說你打算改哪些檔案、怎麼改，等使用者同意再動手。
- 動手前確認目前的程式能跑，並建議先存一個 Git commit。
- 一次只做一件事。做完請使用者在預覽裡實際點過，確認沒問題再 commit。
- 同一個錯誤修了三次還沒好，停下來，把完整錯誤訊息和你的判斷告訴使用者。

## 不准破壞的規則

1. **錢一律由後端算。** 價格、運費、總金額只能在 `app/api/orders/route.ts` 這類後端程式裡，從資料庫重新計算。不准相信前端送來的金額。
2. **秘密不准進前端。** `DATABASE_URL`、`ECPAY_HASH_KEY`、`ECPAY_HASH_IV`、`ADMIN_PASSWORD` 只能在後端讀。任何環境變數都不准為了讓前端讀得到而加上 `NEXT_PUBLIC_` 前綴。
3. **不准修改、讀出或印出 `.env.local` 的內容。** 需要新的環境變數時，加到 `.env.example`（只寫名稱和說明，不寫秘密的值），再告訴使用者要自己填在哪裡。
4. **訂單狀態與付款狀態是兩個欄位。** 狀態只能照 `lib/orders.ts` 的 `ALLOWED_NEXT` 走。`pending → confirmed` 只能由 `/api/ecpay/notify` 觸發。
5. **付款通知必須冪等。** `/api/ecpay/notify` 先檢查 CheckMacValue，再用 `payments.ecpay_trade_no` 確認沒處理過才處理。成功時一定回 `1|OK`。
6. **營收用成交單價。** 計算營收用 `order_items.unit_price × quantity`，不用 `products.price`。
7. **看訂單要確認是本人。** `/orders/[id]` 必須比對 cookie 裡的 access token；後台每個動作都要先檢查 `isAdmin()`。
8. **動到資料庫結構或資料前，先問。** 改資料表請改 `scripts/schema.sql` 並說明會不會影響既有資料；刪除資料的指令一律先讓使用者確認。Git 還原不會把資料庫的資料救回來。

## 常用指令

- `npm run dev`：本機啟動，網址 http://localhost:3000
- `npm run db:setup`：建立資料表、放入範例商品（可重複執行）
- `npm run simulate:paid -- 訂單編號`：本機模擬綠界付款成功通知
- `npm run build`：部署前確認能建置成功

## 店名與外觀

- 店名、標語、運費在 `lib/shop.ts`。
- 顏色在 `app/globals.css` 的 `:root`。改顏色時，文字對背景的對比要維持 4.5:1 以上。
