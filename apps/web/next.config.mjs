/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static marketing site — served as plain files (no serverless functions).
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
