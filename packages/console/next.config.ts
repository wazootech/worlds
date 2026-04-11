import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["child_process"],
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
