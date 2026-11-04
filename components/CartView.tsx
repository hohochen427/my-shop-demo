"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import JarArt from "./JarArt";
import { readCart, writeCart, type CartLine } from "@/lib/cart";

type P = { id: number; name: string; price: number; stock: number; color: string; slug: string };
const nt = (n: number) => "NT$ " + n.toLocaleString("zh-TW");

export default function CartView({ shippingFee, freeOver }: { shippingFee: number; freeOver: number }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Record<number, P>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLines(readCart());
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        const map: Record<number, P> = {};
        (d.products ?? []).forEach((p: P) => (map[p.id] = p));
        setProducts(map);
      })
      .catch(() => setError("讀不到商品資料，請稍後重新整理"))
      .finally(() => setLoaded(true));
  }, []);

  function update(next: CartLine[]) {
    setLines(next);
    writeCart(next);
  }

  const shown = lines.filter((l) => products[l.productId]);
  const subtotal = shown.reduce((s, l) => s + products[l.productId].price * l.quantity, 0);
  const shipping = subtotal >= freeOver || subtotal === 0 ? 0 : shippingFee;

  async function checkout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: shown.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          customer: { name: f.get("name"), email: f.get("email"), phone: f.get("phone"), address: f.get("address") },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "結帳失敗，請再試一次");
        setBusy(false);
        return;
      }
      writeCart([]);
      // 把後端準備好的付款表單送到綠界
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.ecpay.action;
      for (const [k, v] of Object.entries(data.ecpay.fields as Record<string, string>)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch {
      setError("網路連線有問題，請再試一次");
      setBusy(false);
    }
  }

  if (!loaded) return <p className="section">讀取購物車中…</p>;
  if (shown.length === 0)
    return (
      <div className="section">
        <h1>購物車</h1>
        <p>購物車是空的。</p>
        <Link className="btn" href="/">去逛逛</Link>
        {error && <p className="notice err" role="alert">{error}</p>}
      </div>
    );

  return (
    <>
      <h1 style={{ marginTop: 32 }}>購物車</h1>
      <div className="cart-layout">
        <section className="panel" aria-label="購物車內容">
          {shown.map((l) => {
            const p = products[l.productId];
            return (
              <div className="line" key={l.productId}>
                <JarArt color={p.color} label={p.name} size={64} />
                <div>
                  <Link href={`/products/${p.slug}`}><b>{p.name}</b></Link>
                  <div className="meta">
                    <span>{nt(p.price)}</span>
                    <div className="qty" role="group" aria-label={`${p.name} 的數量`}>
                      <button type="button" aria-label="減少一罐"
                        onClick={() => update(lines.map((x) => x.productId === l.productId ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}>−</button>
                      <output aria-live="polite">{l.quantity}</output>
                      <button type="button" aria-label="增加一罐"
                        onClick={() => update(lines.map((x) => x.productId === l.productId ? { ...x, quantity: Math.min(20, x.quantity + 1) } : x))}>＋</button>
                    </div>
                    <button type="button" className="linkbtn" onClick={() => update(lines.filter((x) => x.productId !== l.productId))}>
                      移除
                    </button>
                  </div>
                </div>
                <b>{nt(p.price * l.quantity)}</b>
              </div>
            );
          })}
        </section>

        <section className="panel" aria-labelledby="checkout-h">
          <h2 id="checkout-h" style={{ fontSize: "1.2rem" }}>結帳</h2>
          <div className="sum"><span>商品小計</span><span>{nt(subtotal)}</span></div>
          <div className="sum"><span>運費</span><span>{shipping === 0 ? "免運" : nt(shipping)}</span></div>
          <div className="sum total"><span>預估總金額</span><span>{nt(subtotal + shipping)}</span></div>
          <p className="hint">實際金額以送出後店家系統計算為準。滿 {nt(freeOver)} 免運。</p>
          <form onSubmit={checkout} style={{ marginTop: 16 }}>
            <div className="field"><label htmlFor="name">收件人姓名</label><input id="name" name="name" type="text" required autoComplete="name" /></div>
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
            <div className="field"><label htmlFor="phone">手機</label><input id="phone" name="phone" type="tel" required autoComplete="tel" /></div>
            <div className="field"><label htmlFor="address">收件地址</label><input id="address" name="address" type="text" required autoComplete="street-address" /></div>
            {error && <p className="notice err" role="alert">{error}</p>}
            <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "建立訂單中…" : "前往綠界付款（測試）"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
