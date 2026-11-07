# 優惠碼：設計規格（SDD）

- 狀態：草稿，待店主確認
- 日期：2026-11-07
- 依據：[PRD.md](PRD.md)
- 技術：沿用 Next.js 16（App Router、Server Actions）、TypeScript、Neon（`pg` 套件）。**不安裝新套件**，測試使用 Node 24 內建的 `node --test`。

## 1. 現況（不改的部分）

| 檔案 | 現在負責什麼 |
|---|---|
| `scripts/schema.sql` | `coupons`、`coupon_redemptions` 兩張表，以及 `orders.coupon_code`、`orders.discount` 兩欄。**這次不改結構** |
| `lib/coupons.ts` | `normalizeCode`、`discountFor`、`checkCoupon`：已用次數只算 `released_at IS NULL` 的紀錄 |
| `app/api/orders/route.ts` | 建單時用 `FOR UPDATE` 鎖住碼、重新驗碼、寫入 `coupon_redemptions` |
| `app/api/coupons/check/route.ts` | 購物車按「套用」時的試算，不佔名額 |
| `components/CartView.tsx`、`app/orders/[id]/page.tsx` | 顯示折抵 |

`checkCoupon` 已經只計算沒退回的紀錄，所以**只要在對的時間填入或清空 `released_at`**，名額就會自動正確，驗碼的邏輯不用改。

## 2. 名額退回與重新佔用（F1–F3）

名額狀態只靠 `coupon_redemptions.released_at`：
- `NULL` = 佔用中
- 有時間 = 已退回

### 2.1 取消訂單時退回（F1）
- 檔案：`app/admin/actions.ts` 的 `changeStatus`
- 只有在**真的把狀態改成 `cancelled`**（`allowed && !blocked` 成立）時，在同一個交易裡（交易是「全部成功或全部不算」的一組資料庫動作）執行：
  ```sql
  UPDATE coupon_redemptions SET released_at = now()
  WHERE order_id = $1 AND released_at IS NULL
  ```
- 加 `released_at IS NULL` 條件，重複執行也不會改到已退回的紀錄。
- 狀態轉換仍然照 `ALLOWED_NEXT`，不新增任何路線（CLAUDE.md 第 4 條）。

### 2.2 付款失敗時退回（F2）
- 檔案：`app/api/ecpay/notify/route.ts`
- 在現有的 `else if (order.payment_status === "unpaid")` 分支（把訂單標成 `failed` 的地方）同時執行 2.1 那段 SQL。
- 這一段在「帳本寫入成功」之後才執行，所以重送的同一筆通知會在前面直接回 `1|OK`，不會重複處理（CLAUDE.md 第 5 條）。

### 2.3 失敗後又付款成功：重新佔用（F3）
- 檔案：同上，放在一般成功分支（把訂單改成 `paid`／`confirmed`、扣庫存的那段）裡：
  ```sql
  UPDATE coupon_redemptions SET released_at = NULL
  WHERE order_id = $1 AND released_at IS NOT NULL
  ```
- 錢已經收了，照原本的折扣成交，**不重新檢查名額**。
- 如果重新佔用後超過 `total_limit`，就在 `orders.review_note` 寫「優惠碼 X 名額超用，請確認」，讓訂單出現在後台的「需要人工處理」。（是否接受這個做法，見 TASKS.md 的待決定事項。）
- 已取消的訂單收到付款時，維持現有的人工處理流程，**不重新佔用**名額。

### 2.4 本機模擬付款失敗
- 檔案：`scripts/simulate-notify.mjs`
- 新增 `--fail` 參數：送出 `RtnCode: "0"`、`RtnMsg: "付款失敗（模擬）"`，其他欄位和檢查碼的算法不變。
- 用法：`npm run simulate:paid -- 1001 --fail`

## 3. 營收扣折扣（F4）與訂單列表顯示碼（F5）

- 檔案：`app/admin/page.tsx`
- 營收查詢改成三個子查詢，避免折扣跟著訂單明細的列數被重複加總：
  ```sql
  SELECT
    (SELECT COALESCE(SUM(oi.unit_price * oi.quantity), 0) FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.payment_status = 'paid' AND o.status <> 'cancelled')::int AS gross,
    (SELECT COALESCE(SUM(o.discount), 0) FROM orders o
       WHERE o.payment_status = 'paid' AND o.status <> 'cancelled')::int AS discount_total,
    (SELECT COUNT(*) FROM orders o
       WHERE o.payment_status = 'paid' AND o.status <> 'cancelled')::int AS n
  ```
- 畫面：
  - 「商品實收（已扣優惠、不含運費）」= `gross − discount_total`
  - 新增一格「優惠折抵合計」= `discount_total`
- 訂單列表的查詢多選 `o.coupon_code, o.discount`。金額欄在 `discount > 0` 時，下方以 `.hint` 樣式顯示「TEST100 −NT$ 100」。
- `CLAUDE.md` 第 6 條改成：「計算營收用 `order_items.unit_price × quantity` 再減去 `orders.discount`，不用 `products.price`。」**要店主同意才改。**

## 4. 後台優惠碼管理（F6–F8）

### 4.1 檔案

| 檔案 | 新增或修改 | 負責什麼 |
|---|---|---|
| `lib/coupon-input.ts` | 新增 | `parseCouponInput(fields)`：純函式（不連資料庫、不 import 其他檔案），檢查並整理表單欄位，回傳 `{ ok: true, value }` 或 `{ ok: false, error }`。獨立成一個檔案，是為了能用 `node --test` 直接測試 |
| `app/admin/coupons/actions.ts` | 新增 | Server Actions（在伺服器上執行、由表單直接呼叫的函式）`createCoupon`、`deactivateCoupon`。第一行都先檢查 `isAdmin()` |
| `app/admin/coupons/page.tsx` | 新增 | 優惠碼頁：未登入時導回 `/admin`；上方是新增表單，下方是列表 |
| `app/admin/page.tsx` | 修改 | 標題列加上「優惠碼管理」連結 |

### 4.2 欄位檢查規則（`parseCouponInput`）

| 欄位 | 規則 | 錯誤訊息 |
|---|---|---|
| 碼 | 去掉前後空白、轉大寫；3–40 字，只能用 A–Z、0–9、`-`、`_` | 優惠碼要 3–40 個英文字母、數字、- 或 _ |
| 折扣方式 | `fixed`（折固定金額）或 `percent`（打折） | 請選擇折扣方式 |
| 折扣值 | 正整數；`percent` 時為 1–99 | 折扣金額要是正整數／百分比要在 1 到 99 之間 |
| 最高折抵 | 選填；正整數；只有 `percent` 會用到 | 最高折抵要是正整數 |
| 最低消費 | 選填，空白當 0；0 以上的整數 | 最低消費要是 0 以上的整數 |
| 開始時間 | 選填，空白代表現在；當作臺灣時間（+08:00） | 開始時間格式不對 |
| 結束時間 | 選填，空白代表不限；必須晚於開始時間 | 結束時間要晚於開始時間 |
| 總名額 | 選填，空白代表不限；正整數 | 總名額要是正整數 |
| 每人限次 | 預設 1；空白代表不限；正整數 | 每人限次要是正整數 |
| 備註 | 選填，最多 100 字 | 備註最多 100 字 |

資料庫本身的 `CHECK` 限制是第二道防線。碼名重複（資料庫錯誤代碼 `23505`）時顯示「這個優惠碼已經有了」。

### 4.3 錯誤與成功訊息
- Server Action 完成後導回 `/admin/coupons?msg=<代號>`，頁面用固定的對照表把代號轉成文字。**不把使用者輸入的文字直接放進網址或畫面**，避免被塞入惡意內容。
- 驗證失敗時，代號就是 4.2 那張表對應的錯誤。

### 4.4 列表
```sql
SELECT c.*, COUNT(r.id) FILTER (WHERE r.released_at IS NULL)::int AS used
FROM coupons c LEFT JOIN coupon_redemptions r ON r.coupon_id = c.id
GROUP BY c.id ORDER BY c.id DESC
```
- 欄位：碼、折扣（「折 NT$ 100」或「9 折，最多折 NT$ 200」）、最低消費、期間（臺灣時間）、已用／總名額、每人限次、狀態、備註、操作。
- 狀態依序判斷：已停用 → 未開始 → 已過期 → 已用完 → 可使用，用現有的 `.badge` 樣式顯示。
- 「停用」按鈕只出現在還沒停用的碼上，按下後執行 `UPDATE coupons SET active = false WHERE id = $1`。
- 外層用現有的 `.table-scroll`，手機上只有表格本身可以左右滑，整頁不會左右捲。

## 5. 安全與規則對照

| 規則 | 落實方式 |
|---|---|
| 錢由後端算 | 不改變現狀；新增碼的每個欄位都在後端驗證 |
| 秘密不進前端 | 不需要新的環境變數 |
| 狀態只照 `ALLOWED_NEXT` 走 | 不新增轉換 |
| 付款通知冪等 | 退回和重新佔用都放在帳本去重之後；SQL 本身重複執行也安全 |
| 營收用成交單價 | 第 3 節，CLAUDE.md 文字要店主同意 |
| 後台要 `isAdmin()` | `createCoupon`、`deactivateCoupon`、優惠碼頁都檢查 |
| 動資料庫先問 | 不改結構。驗收時會寫入測試資料，執行前另外詢問 |

## 6. 測試策略

- **單元測試**：`scripts/tests/coupon-input.test.ts`，用 `node --test` 執行（Node 24 可以直接跑 TypeScript，不用裝套件），涵蓋 4.2 每條規則的合法和不合法輸入。
- **退回名額的回歸檢查**：`scripts/check-coupon-release.mjs`，對本機網站實際操作：建立一個專用測試碼 → 下單 → 模擬付款失敗 → 確認名額退回 → 同一個 Email 再下單成功 → 取消 → 確認名額再次退回。只要退回名額的邏輯壞掉，這支腳本就會失敗。它會在 Neon 寫入測試訂單和測試碼，**每次執行前要店主同意**。
- **人工驗收**：照 TASKS.md 每個任務的「驗收方式」，在預覽和手機寬度各點一次。
- **建置**：`npm run build` 必須成功。
