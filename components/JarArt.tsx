import Image from "next/image";

// 商品圖：有店主用 Grok 產生的示意照片（public/jams/jam-<slug>.jpg）就用照片，
// 沒有照片的商品才用原創的果醬罐插圖（顏色依商品而不同）。
// 照片是 AI 示意圖、非實拍：商品頁會另外標示。
export const JAM_PHOTOS = new Set(["strawberry", "mango-passion", "blueberry", "pomelo-lemon", "roselle", "fig"]);

export default function JarArt({ color, label, slug, size = 320 }: { color: string; label: string; slug?: string; size?: number }) {
  if (slug && JAM_PHOTOS.has(slug)) {
    return (
      <Image
        className="jar jar-photo"
        src={`/jams/jam-${slug}.jpg`}
        alt={`${label}（AI 示意圖）`}
        width={1792}
        height={1008}
        // 卡片和商品頁都是 4:3 的框，照片置中裁切；購物車縮圖只要 64px
        sizes={size <= 64 ? "64px" : "(max-width: 720px) 100vw, 540px"}
        style={size <= 64 ? { width: size, height: size } : undefined}
      />
    );
  }
  return (
    <svg className="jar" viewBox="0 0 320 240" width={size} role="img" aria-label={`${label}的果醬罐插圖`}>
      <rect x="0" y="0" width="320" height="240" fill="#fbe7d6" />
      <circle cx="262" cy="52" r="26" fill="#f6d2b4" />
      <rect x="118" y="44" width="84" height="22" rx="5" fill="#5c4535" />
      <rect x="112" y="62" width="96" height="10" rx="4" fill="#7a5c48" />
      <path d="M104 78 h112 a10 10 0 0 1 10 10 v104 a22 22 0 0 1 -22 22 h-88 a22 22 0 0 1 -22 -22 v-104 a10 10 0 0 1 10 -10z" fill="#ffffff" opacity="0.65" />
      <path d="M100 112 h120 v80 a20 20 0 0 1 -20 20 h-80 a20 20 0 0 1 -20 -20z" fill={color} />
      <rect x="122" y="126" width="76" height="46" rx="6" fill="#fffaf3" />
      <rect x="132" y="138" width="56" height="6" rx="3" fill="#a8907c" />
      <rect x="140" y="152" width="40" height="6" rx="3" fill="#cdbba9" />
      <ellipse cx="112" cy="104" rx="5" ry="16" fill="#ffffff" opacity="0.55" />
    </svg>
  );
}
