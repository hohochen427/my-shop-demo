// 訂單狀態與付款狀態是兩個不同的欄位（Day 5）。
// 訂單狀態：店家處理到哪一步；付款狀態：錢有沒有收到。

export const ORDER_STATUS: Record<string, string> = {
  pending: "待付款",
  confirmed: "已確認",
  shipped: "已出貨",
  completed: "已完成",
  cancelled: "已取消",
};

export const PAYMENT_STATUS: Record<string, string> = {
  unpaid: "未付款",
  paid: "已付款",
  failed: "付款失敗",
  refunded: "已退款",
};

// 店家在後台可以手動推進的路線。沒有列在這裡的轉換一律不准。
// pending → confirmed 只能由綠界的付款通知觸發，後台不能手動按。
export const ALLOWED_NEXT: Record<string, string[]> = {
  pending: ["cancelled"],
  confirmed: ["shipped"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

export const STATUS_FLOW = ["pending", "confirmed", "shipped", "completed"];
