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
            <div className="head-actions">
              <a href={SHOP.islandUrl} className="island-link" aria-label="回小島" title="回小島">
                {/* 小島圖示：沙丘＋椰子樹＋海浪，用文字色畫，不依賴表情符號字型 */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 20c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" />
                  <path d="M5 17c1.5-2.5 4-3.5 7-3.5s5.5 1 7 3.5" />
                  <path d="M12 13.5c0-3 .5-5.5 2-8" />
                  <path d="M14 5.5c-1.5-1.5-4-1.5-5.5 0M14 5.5c1.5-1.2 4-1 5 .8M14 5.5c-.3 2 .6 3.6 2.2 4.3" />
                </svg>
                <span className="island-text">回小島</span>
              </a>
              <CartCount />
            </div>
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
