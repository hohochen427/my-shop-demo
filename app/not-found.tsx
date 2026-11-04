import Link from "next/link";
export default function NotFound() {
  return (
    <div className="section">
      <h1>找不到這一頁</h1>
      <p><Link href="/">回到首頁</Link></p>
    </div>
  );
}
