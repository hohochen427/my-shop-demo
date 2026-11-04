import { db } from "./db";

export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  color: string;
};

const COLS = "id, slug, name, description, price, stock, color";

export async function listProducts(): Promise<Product[]> {
  const { rows } = await db().query(`SELECT ${COLS} FROM products ORDER BY id`);
  return rows;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { rows } = await db().query(`SELECT ${COLS} FROM products WHERE slug = $1`, [slug]);
  return rows[0] ?? null;
}

export async function getProductById(id: number): Promise<Product | null> {
  const { rows } = await db().query(`SELECT ${COLS} FROM products WHERE id = $1`, [id]);
  return rows[0] ?? null;
}
