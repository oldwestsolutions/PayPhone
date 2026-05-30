import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static marketing site — no serverless functions on Vercel (avoids 500 crashes when project root is misconfigured).
  output: "export",
  images: { unoptimized: true },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
