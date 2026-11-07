// 店的基本設定。改店名、標語、運費，都在這個檔案。
export const SHOP = {
  name: "(  HenHen日初 shop)",
  tagline: "小農水果，小鍋慢熬，一罐一罐裝進你家的早餐桌。",
  shippingFee: 80,
  freeShippingOver: 1000,
  // 3D 果醬島（D:\jam-island）的網址。目前只在這台電腦上開得到；小島放上網後改成正式網址。
  islandUrl: "http://127.0.0.1:8123/",
};

// 運費規則：由後端計算，前端顯示的只是預估
export function shippingFor(subtotal: number): number {
  return subtotal >= SHOP.freeShippingOver ? 0 : SHOP.shippingFee;
}

export function formatNT(n: number): string {
  return "NT$ " + n.toLocaleString("zh-TW");
}
