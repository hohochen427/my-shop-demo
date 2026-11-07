// 店的基本設定。改店名、標語、運費，都在這個檔案。
export const SHOP = {
  name: "(  HenHen日初 shop)",
  tagline: "小農水果，小鍋慢熬，一罐一罐裝進你家的早餐桌。",
  shippingFee: 80,
  freeShippingOver: 1000,
  // 3D 果醬島（D:\jam-island）的正式網址，Netlify 專案名稱 henhen-jan-island（店主 2026-11-08 改名）。
  // （舊的 jam-island.netlify.app 還是舊版，不要連那邊）
  islandUrl: "https://henhen-jan-island.netlify.app/",
};

// 運費規則：由後端計算，前端顯示的只是預估
export function shippingFor(subtotal: number): number {
  return subtotal >= SHOP.freeShippingOver ? 0 : SHOP.shippingFee;
}

export function formatNT(n: number): string {
  return "NT$ " + n.toLocaleString("zh-TW");
}
