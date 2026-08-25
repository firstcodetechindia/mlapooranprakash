import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) dynamically locates a sibling pdf.worker.mjs
  // relative to its own module at runtime. Bundling it through Turbopack
  // breaks that relative lookup ("Setting up fake worker failed: Cannot
  // find module .../pdf.worker.mjs") since chunking doesn't preserve the
  // package's real file layout. Excluding it here makes Next.js resolve
  // it natively from node_modules instead, where the lookup works.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
