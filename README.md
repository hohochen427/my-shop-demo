# 小島果醬：課程範本商店

「不會寫程式，也能讓 AI 幫你開一間店」課程用的範本。用 Next.js 寫成，資料放在 Neon，部署在 Vercel，付款走綠界測試環境（不會真的扣款）。

## 這間店有什麼

| 頁面 | 網址 | 誰會用 |
|---|---|---|
| 首頁，所有商品 | `/` | 客人 |
| 商品頁 | `/products/strawberry` | 客人 |
| 購物車與結帳（可輸入優惠碼） | `/cart` | 客人 |
| 優惠碼試算：按「套用」時問後端能折多少，不佔名額 | `/api/coupons/check` | 購物車頁 |
| 訂單查詢（有用碼會顯示優惠折抵） | `/orders/1001` | 下單的那位客人 |
| 店家後台：訂單、營收、出貨 | `/admin` | 店家 |
| 商品資料 API | `/api/products`、`/api/products/1` | 前端、其他程式 |
| 綠界付款通知 | `/api/ecpay/notify` | 綠界的伺服器 |

## 在自己的電腦上跑起來

需要先裝好 Node.js（LTS 版）和 Git。

**第一步：安裝套件**

```
npm install
```

**第二步：建立環境變數檔**

把 `.env.example` 複製一份，改名為 `.env.local`，打開後填兩格：

| 名稱 | 填什麼 |
|---|---|
| `DATABASE_URL` | Neon 專案按 Connect 複製的整串連線字串（有密碼，是秘密） |
| `ADMIN_PASSWORD` | 自己取一個後台密碼 |

綠界的三格（`ECPAY_MERCHANT_ID`、`ECPAY_HASH_KEY`、`ECPAY_HASH_IV`）已經填好綠界公開的測試值，不用改。

**第三步：建立資料表、放進範例商品**

```
npm run db:setup
```

看到兩個 ✔ 就成功了。重複執行也沒關係，不會重複放商品。

**第四步：啟動網站**

```
npm run dev
```

打開 http://localhost:3000 就看得到果醬店。

## 部署到 Vercel

1. 在 Vercel 按 Add New → Project，選這個 GitHub 倉庫，按 Import
2. 展開 Environment Variables，填入下面六個名稱（值和 `.env.local` 一樣）
3. 按 Deploy

| 名稱 | 值 |
|---|---|
| `DATABASE_URL` | 和 `.env.local` 同一串 |
| `ECPAY_MERCHANT_ID` | `3002607` |
| `ECPAY_HASH_KEY` | `pwFHCqoQZGmho4w6` |
| `ECPAY_HASH_IV` | `EkRm7iFT261dpevs` |
| `ECPAY_MODE` | `stage`（測試環境） |
| `ADMIN_PASSWORD` | 和 `.env.local` 同一個 |

> **換成正式收款金鑰時，一定要把 `ECPAY_MODE` 改成 `production`。**
> `ECPAY_MODE` 只有完全等於 `production`（全小寫）才是正式模式；沒填、填錯字或大小寫不同，都會被當成測試環境 `stage`。
> 如果換了正式金鑰卻忘了改：客人會被送到綠界的**測試**付款頁，正式金鑰在那裡無法付款；而且系統會接受綠界後台的「模擬付款」通知，訂單可能在**沒收到錢**的情況下被標成已付款。

小技巧：把 `.env.local` 的全部內容複製起來，貼進 Vercel 第一個 Key 欄位，它會自動拆成好幾格。

部署後如果首頁說「還沒連上資料庫」，到 Settings → Environment Variables 檢查名稱和值，改完按 Redeploy。

## 測試付款

結帳後會跳到綠界的測試付款頁，用這張測試卡：

- 卡號：4311-9522-2222-2222
- 安全碼：222
- 有效年月：未來的任一個月

**付款結果只有在 Vercel 上線的網址才會自動更新**。綠界付完款，會從它的伺服器通知 `/api/ecpay/notify`，但它連不到你電腦上的 localhost。

在自己電腦上想測試「付款成功之後」的流程，可以用模擬通知（網站要開著）：

```
npm run simulate:paid -- 1001
npm run simulate:paid -- 1001 --twice
```

`1001` 換成你的訂單編號。加上 `--twice` 會把同一筆通知送兩次，可以到後台確認營收沒有被算兩次。

## 資料表

| 資料表 | 存什麼 |
|---|---|
| `products` | 商品：名稱、價格、庫存 |
| `customers` | 客人：同一個 Email 只存一筆 |
| `orders` | 訂單：訂單狀態 `status` 和付款狀態 `payment_status` 是兩個欄位 |
| `order_items` | 訂單明細：記下成交當下的單價 |
| `payments` | 付款通知帳本：同一個綠界交易編號只處理一次 |

訂單狀態只能沿著這條路走：

```
pending 待付款 → confirmed 已確認 → shipped 已出貨 → completed 已完成
pending 待付款 → cancelled 已取消（只有未付款的訂單可以取消）
```

`pending → confirmed` 只會由綠界的付款通知觸發。已取消的訂單如果收到付款，不會自動恢復，會出現在後台的「需要人工處理」。

## 檔案在哪裡

| 想改什麼 | 檔案 |
|---|---|
| 店名、標語、運費 | `lib/shop.ts` |
| 顏色、字體、版面 | `app/globals.css` |
| 首頁 | `app/page.tsx` |
| 商品頁 | `app/products/[slug]/page.tsx` |
| 購物車與結帳畫面 | `components/CartView.tsx` |
| 建立訂單（後端算錢） | `app/api/orders/route.ts` |
| 綠界付款通知 | `app/api/ecpay/notify/route.ts` |
| 後台 | `app/admin/` |
| 資料表結構與範例商品 | `scripts/schema.sql`、`scripts/db-setup.mjs` |

## 已知限制

### 優惠碼：這一版還沒處理的缺口

| 限制 | 會發生什麼 | 目前的替代做法 |
|---|---|---|
| 沒有後台管理優惠碼的頁面 | 新增、停用優惠碼都要在 Neon 下 SQL | 照 `docs/coupon/` 的計畫，之後加上 `/admin/coupons` |
| 訂單取消或付款失敗，名額不會退回 | 客人刷卡失敗後重新下單，會看到「這個 Email 已經用過這個優惠碼」 | 請客人換一個 Email，或由店家在資料庫手動處理 |
| 後台「商品營收」沒有扣掉優惠折抵 | 營收會比實際收到的錢多（每用一次碼，多算一次折扣金額） | 實收以訂單的「金額」欄為準 |
| 後台訂單列表看不到用了哪個碼 | 只看得到折扣後的金額 | 客人的訂單頁看得到「優惠折抵（碼）」 |

### 優惠碼：這一版刻意先不做的事

- 每人限用次數用 Email 認人，換一個 Email 就能再用（沒有會員系統）
- 一張訂單只能用一個碼；不能限定只有某些商品才能用
- 待付款的訂單不會自動逾時取消，會一直佔著名額，要店家手動取消
- 沒有限制試碼的次數，理論上可以一直猜碼
- 沒有退款流程，退款時折扣怎麼處理也還沒定義
- 免運門檻看的是**折扣前**的商品小計

### 其他

- 後台在手機等窄畫面上，訂單表格的「商品」欄會被擠成一個字一行，要左右滑才看得清楚

## 給 Claude Code 的規則

請 Claude Code 工作前先讀 `CLAUDE.md`。裡面寫了這間店不准破壞的幾條規則。

綠界有官方釋出給 AI 開發工具用的 Skill（[ecpay/ecpay-api-skill](https://github.com/ecpay/ecpay-api-skill)），要加新的付款方式、電子發票或物流時，可以請 Claude Code 先裝上它再動手。
