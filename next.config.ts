import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/mezzanine",
        permanent: false,
        has: [{ type: "host", value: "mezzanine.ai.kr" }],
      },
    ];
  },
};

export default nextConfig;
