import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "@/components/AddToCart";
import JarArt from "@/components/JarArt";
import SetupNotice, { dbErrorReason } from "@/components/SetupNotice";
import { getProductBySlug, type Product } from "@/lib/products";
import { formatNT } from "@/lib/shop";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let p: Product | null = null;
  try {
    p = await getProductBySlug(slug);
  } catch (e) {
    return <SetupNotice reason={dbErrorReason(e)} />;
  }
  if (!p) notFound();

  return (
    <>
      <p style={{ marginTop: 24 }}><Link href="/">← 回到所有商品</Link></p>
      <div className="detail">
        <div className="art"><JarArt color={p.color} label={p.name} /></div>
        <div>
          <h1>{p.name}</h1>
          <p className="price" style={{ fontSize: "1.4rem" }}>{formatNT(p.price)}</p>
          <p>{p.description}</p>
          <p className="stock">庫存 {p.stock} 罐</p>
          <AddToCart productId={p.id} name={p.name} />
        </div>
      </div>
    </>
  );
}
