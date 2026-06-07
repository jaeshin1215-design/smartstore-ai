import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/mezzanine",
        has: [{ type: "host", value: "mezzanine.ai.kr" }],
      },
    ];
  },
};

export default nextConfig;
