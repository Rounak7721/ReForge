import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with a self-contained server.js and only the
  // node_modules actually reached. This is what lets the Docker runner stage
  // drop pnpm, the lockfile and the dev dependencies — the image goes from
  // "the whole repo plus node_modules" to roughly the app itself.
  // Vercel ignores this and uses its own packer, so it costs nothing there.
  output: "standalone",
};

export default nextConfig;
