-- 小島果醬的五張資料表。重複執行也安全（IF NOT EXISTS）。

-- 商品
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,          -- 網址用的英文代號，例如 strawberry
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       INTEGER NOT NULL CHECK (price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  color       TEXT NOT NULL DEFAULT '#B45309', -- 果醬罐插圖的顏色
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 客人：同一個 email 只存一筆，地址不用每張訂單重打
CREATE TABLE IF NOT EXISTS customers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  phone      TEXT NOT NULL,
  address    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 訂單：訂單狀態與付款狀態分成兩個欄位
CREATE TABLE IF NOT EXISTS orders (
  id                SERIAL PRIMARY KEY,
  customer_id       INTEGER NOT NULL REFERENCES customers(id),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','shipped','completed','cancelled')),
  payment_status    TEXT NOT NULL DEFAULT 'unpaid'
                    CHECK (payment_status IN ('unpaid','paid','failed','refunded')),
  subtotal          INTEGER NOT NULL,
  shipping_fee      INTEGER NOT NULL,
  total             INTEGER NOT NULL,
  merchant_trade_no TEXT UNIQUE NOT NULL,    -- 送給綠界的交易編號
  access_token      TEXT NOT NULL,           -- 只有下單的瀏覽器拿得到，用來確認「這張訂單是你的」
  review_note       TEXT,                    -- 需要人工處理時寫在這裡
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 訂單編號從 1001 開始
SELECT setval(pg_get_serial_sequence('orders','id'), 1000, true)
WHERE NOT EXISTS (SELECT 1 FROM orders);

-- 訂單明細：記下「成交當下」的單價，之後商品改價也不影響這筆
CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(id),
  product_id   INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_price   INTEGER NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0)
);

-- 付款通知帳本：每一筆綠界通知都記下來，同一個綠界交易編號只處理一次
CREATE TABLE IF NOT EXISTS payments (
  id                SERIAL PRIMARY KEY,
  ecpay_trade_no    TEXT UNIQUE NOT NULL,
  merchant_trade_no TEXT NOT NULL,
  rtn_code          TEXT NOT NULL,
  amount            INTEGER NOT NULL,
  simulate_paid     BOOLEAN NOT NULL DEFAULT false,
  raw               JSONB NOT NULL,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
