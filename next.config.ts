import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지를 만들 때만 standalone 출력(NEXT_OUTPUT=standalone). 로컬 `next start`는 기본값.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
