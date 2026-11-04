import { NextResponse } from "next/server";
import { getProductById } from "@/lib/products";

export const dynamic = "force-dynamic";

// GET /api/products/1：單一商品
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    return NextResponse.json({ error: "商品編號格式不對" }, { status: 400 });
  }
  const product = await getProductById(n).catch(() => null);
  if (!product) return NextResponse.json({ error: "找不到這個商品" }, { status: 404 });
  return NextResponse.json({ product });
}
