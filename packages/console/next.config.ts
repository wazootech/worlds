import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wazoo.dev",
      },
    ],
  },
};

export default nextConfig;
