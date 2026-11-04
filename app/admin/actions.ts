"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ALLOWED_NEXT } from "@/lib/orders";
import { isAdmin, signIn, signOut } from "@/lib/admin-auth";

export async function login(formData: FormData) {
  const ok = await signIn(String(formData.get("password") ?? ""));
  redirect(ok ? "/admin" : "/admin?error=1");
}

export async function logout() {
  await signOut();
  redirect("/admin");
}

// 改訂單狀態：每次都在後端重新確認「是不是店家」與「這條路准不准走」
export async function changeStatus(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin");
  const id = Number(formData.get("orderId"));
  const to = String(formData.get("to"));
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT status, payment_status FROM orders WHERE id = $1 FOR UPDATE", [id]);
    const o = rows[0];
    const allowed = o && (ALLOWED_NEXT[o.status] ?? []).includes(to);
    // 已付款的訂單不能直接在這裡取消，要先處理退款
    const blocked = to === "cancelled" && o?.payment_status === "paid";
    if (allowed && !blocked) {
      await client.query("UPDATE orders SET status = $2 WHERE id = $1", [id, to]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  revalidatePath("/admin");
}

export async function clearReview(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin");
  await db().query("UPDATE orders SET review_note = NULL WHERE id = $1", [Number(formData.get("orderId"))]);
  revalidatePath("/admin");
}
