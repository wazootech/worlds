import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wazoo.tech",
      },
    ],
  },
};

export default nextConfig;
