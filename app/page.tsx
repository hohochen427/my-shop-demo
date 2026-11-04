import Link from "next/link";
import JarArt from "@/components/JarArt";
import SetupNotice, { dbErrorReason } from "@/components/SetupNotice";
import { listProducts, type Product } from "@/lib/products";
import { SHOP, formatNT } from "@/lib/shop";

export const dynamic = "force-dynamic";

export default async function Home() {
  let products: Product[] = [];
  let problem: ReturnType<typeof dbErrorReason> | null = null;
  try {
    products = await listProducts();
  } catch (e) {
    problem = dbErrorReason(e);
  }

  return (
    <>
      <section className="hero">
        <h1>{SHOP.name}</h1>
        <p>{SHOP.tagline}</p>
      </section>
      {problem ? (
        <SetupNotice reason={problem} />
      ) : (
        <section aria-label="商品列表" className="grid">
          {products.map((p) => (
            <article key={p.id} className="card">
              <Link href={`/products/${p.slug}`} className="cover" tabIndex={-1} aria-hidden="true">
                <JarArt color={p.color} label={p.name} />
              </Link>
              <div className="body">
                <h2><Link href={`/products/${p.slug}`}>{p.name}</Link></h2>
                <span className="price">{formatNT(p.price)}</span>
                <span className="stock">庫存 {p.stock} 罐</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
