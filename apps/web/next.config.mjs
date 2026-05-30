import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Monorepo: trace dependencies from repository root (required on Vercel)
    outputFileTracingRoot: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
