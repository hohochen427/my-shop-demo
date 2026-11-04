// 原創的果醬罐插圖，顏色依商品而不同
export default function JarArt({ color, label, size = 320 }: { color: string; label: string; size?: number }) {
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
