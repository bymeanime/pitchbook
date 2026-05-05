import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // TODO: enable once all type errors are fixed
  },
  reactStrictMode: true,
};

export default nextConfig;
