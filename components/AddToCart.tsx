"use client";
import { useState } from "react";
import { addToCart } from "@/lib/cart";

export default function AddToCart({ productId, name }: { productId: number; name: string }) {
  const [q, setQ] = useState(1);
  const [msg, setMsg] = useState("");
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div className="qty" role="group" aria-label="數量">
          <button type="button" onClick={() => setQ(Math.max(1, q - 1))} aria-label="減少一罐">−</button>
          <output aria-live="polite">{q}</output>
          <button type="button" onClick={() => setQ(Math.min(20, q + 1))} aria-label="增加一罐">＋</button>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            addToCart(productId, q);
            setMsg(`已把 ${q} 罐「${name}」加入購物車`);
          }}
        >
          加入購物車
        </button>
      </div>
      <p role="status" className="hint" style={{ minHeight: "1.7em" }}>{msg}</p>
    </div>
  );
}
