import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg 只在伺服器端使用，不要被打包進瀏覽器
  serverExternalPackages: ["pg"],
};

export default nextConfig;
