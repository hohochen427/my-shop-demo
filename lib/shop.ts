// 店的基本設定。改店名、標語、運費，都在這個檔案。
export const SHOP = {
  name: "小島果醬",
  tagline: "小農水果，小鍋慢熬，一罐一罐裝進你家的早餐桌。",
  shippingFee: 80,
  freeShippingOver: 1000,
};

// 運費規則：由後端計算，前端顯示的只是預估
export function shippingFor(subtotal: number): number {
  return subtotal >= SHOP.freeShippingOver ? 0 : SHOP.shippingFee;
}

export function formatNT(n: number): string {
  return "NT$ " + n.toLocaleString("zh-TW");
}
