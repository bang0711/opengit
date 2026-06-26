import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone/server.js) that Electron
  // spawns in production. See electron/main.cjs.
  output: "standalone",
  // Don't bundle sharp for image optimization — it ships libvips (LGPL-3.0) and
  // this app has no need for next/image optimization. Keeps the bundle MIT-ish.
  images: { unoptimized: true },
};

export default nextConfig;
