"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cartCount } from "@/lib/cart";

export default function CartCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const update = () => setN(cartCount());
    update();
    window.addEventListener("cart-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("cart-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return (
    <Link href="/cart" className="cart-link" aria-label={`購物車，目前 ${n} 件`}>
      購物車 <span className="count" aria-hidden="true">{n}</span>
    </Link>
  );
}
