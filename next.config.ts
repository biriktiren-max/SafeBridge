import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next treats 127.0.0.1 as a different origin from localhost and blocks
  // dev assets, which leaves the page server-rendered but not interactive.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
