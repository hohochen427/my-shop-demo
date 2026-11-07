// 把教案原稿 lesson.html 組成可以上傳 Netlify 的網頁。
// 用法（在 D:\my-shop）：node docs/lesson/build.mjs
//   產出 docs/lesson/site/index.html 和 docs/lesson/site/logo-rc.webp，整個 site 資料夾就是要上傳的內容。
// 加 --artifact <檔案路徑>：另外產出一份 logo 內嵌的版本，給 Claude Artifact 發布用（沒有 <html> 外殼、logo 用 data URI）。
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";

const here = new URL("./", import.meta.url);
const src = readFileSync(new URL("lesson.html", here), "utf8");
const logo = new URL("../../public/logo-rc.webp", here);

const styleEnd = src.indexOf("</style>");
if (styleEnd < 0) throw new Error("lesson.html 找不到 </style>，無法分出 head 與 body");
const head = src.slice(0, styleEnd);
const body = src.slice(styleEnd + "</style>".length).replace(/^\r?\n/, "");

const page = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}html, body { margin: 0; }
[hidden] { display: none !important; }
</style>
</head>
<body>
${body}</body>
</html>
`;

const site = new URL("site/", here);
mkdirSync(site, { recursive: true });
writeFileSync(new URL("index.html", site), page);
copyFileSync(logo, new URL("logo-rc.webp", site));
console.log("✔ 已產出 docs/lesson/site/（index.html、logo-rc.webp）");

const i = process.argv.indexOf("--artifact");
if (i > 0) {
  const out = process.argv[i + 1];
  if (!out) throw new Error("--artifact 後面要接輸出檔案路徑");
  const dataUri = "data:image/webp;base64," + readFileSync(logo).toString("base64");
  writeFileSync(out, src.replace('src="logo-rc.webp"', `src="${dataUri}"`));
  console.log(`✔ 已產出 Artifact 版本：${out}`);
}
