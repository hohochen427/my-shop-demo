import type { Metadata } from "next";
import CartView from "@/components/CartView";
import { SHOP } from "@/lib/shop";

export const metadata: Metadata = { title: `購物車｜${SHOP.name}` };

export default function CartPage() {
  return <CartView shippingFee={SHOP.shippingFee} freeOver={SHOP.freeShippingOver} />;
}
