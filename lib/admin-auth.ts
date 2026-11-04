import crypto from "crypto";
import { cookies } from "next/headers";

// 後台登入：密碼放在環境變數 ADMIN_PASSWORD，瀏覽器只拿到一個由密碼算出來的通行證
const COOKIE = "admin_session";

function sessionValue(password: string) {
  return crypto.createHmac("sha256", password).update("jam-shop-admin").digest("hex");
}

export function adminEnabled() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export async function isAdmin(): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const got = (await cookies()).get(COOKIE)?.value ?? "";
  const want = sessionValue(pw);
  return got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function signIn(password: string): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(pw);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  (await cookies()).set(COOKIE, sessionValue(pw), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8, secure: process.env.NODE_ENV === "production" });
  return true;
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}
