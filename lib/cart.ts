"use client";
// 購物車只記在客人自己的瀏覽器裡（前端）。
// 這裡只存「哪個商品、幾個」，價格永遠以後端為準。

export type CartLine = { productId: number; quantity: number };
const KEY = "jam-shop-cart";

export function readCart(): CartLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => Number.isInteger(x.productId) && x.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {}
  window.dispatchEvent(new Event("cart-change"));
}

export function addToCart(productId: number, quantity: number) {
  const lines = readCart();
  const hit = lines.find((l) => l.productId === productId);
  if (hit) hit.quantity = Math.min(20, hit.quantity + quantity);
  else lines.push({ productId, quantity: Math.min(20, quantity) });
  writeCart(lines);
}

export function cartCount(): number {
  return readCart().reduce((s, l) => s + l.quantity, 0);
}
