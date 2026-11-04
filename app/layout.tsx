import type { Metadata } from "next";
import Link from "next/link";
import CartCount from "@/components/CartCount";
import { SHOP } from "@/lib/shop";
import "./globals.css";

export const metadata: Metadata = {
  title: SHOP.name,
  description: SHOP.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-TW">
      <body>
        <a className="skip" href="#main">跳到主要內容</a>
        <header className="site-head">
          <div className="wrap">
            <Link href="/" className="brand">{SHOP.name}</Link>
            <CartCount />
          </div>
        </header>
        <main id="main" className="wrap">{children}</main>
        <footer className="site-foot">
          <div className="wrap">
            <p>這是課程用的示範商店，付款走綠界測試環境，不會真的扣款。測試卡號 4311-9522-2222-2222，安全碼 222，有效年月填未來任一個月。</p>
            <p><Link href="/admin">店家後台</Link></p>
          </div>
        </footer>
      </body>
    </html>
  );
}
