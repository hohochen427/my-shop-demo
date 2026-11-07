import type { Metadata } from "next";
import Link from "next/link";
import { SHOP } from "@/lib/shop";

export const metadata: Metadata = {
  title: `關於我們｜${SHOP.name}`,
  description: "朵朵島上的涵涵婆婆，每天凌晨四點起床熬果醬。",
};

// 品牌故事：涵涵婆婆（店主的真人原型）。只寫店主提供的事實，不自行補細節。
export default function AboutPage() {
  return (
    <>
      <section className="hero">
        <h1>關於我們</h1>
        <p>從凌晨四點開始的一罐果醬。</p>
      </section>

      <article className="section" style={{ maxWidth: "36em", paddingTop: 0 }}>
        <p>朵朵島上，天還黑著。</p>
        <p>
          凌晨四點，涵涵婆婆就起床了。島上還沒有人醒，她已經在廚房裡洗果子、切果子、生火，一樣一樣準備著。
        </p>
        <p>問她為什麼那麼早，她只是笑笑。她常說：</p>

        <blockquote className="panel" style={{ margin: "20px 0", fontSize: "1.2rem", fontWeight: 700 }}>
          「活在當下，珍惜身邊的人，不要浪費。」
        </blockquote>

        <p>
          這句話，就是她熬果醬的方法。挑當季的果子，趁新鮮熬；果子一點都不浪費，每一罐都是熬給身邊的人吃的。
        </p>
        <p>現在，我們照涵涵婆婆的方法，小鍋慢熬，一罐一罐裝好，送到你家的早餐桌。</p>
        <p>
          <strong>HenHen日初，從凌晨四點開始的一罐果醬。</strong>
        </p>
        <p className="hint">朵朵島，是我們對婆婆家鄉的暱稱。</p>

        <p style={{ marginTop: 32 }}>
          <Link href="/" className="btn">看看婆婆的果醬</Link>
        </p>
      </article>
    </>
  );
}
