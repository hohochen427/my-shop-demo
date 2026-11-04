import { NextResponse } from "next/server";
import { listProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

// GET /api/products：所有商品（只給客人該看的欄位）
export async function GET() {
  try {
    const products = await listProducts();
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "目前讀不到商品資料" }, { status: 500 });
  }
}
