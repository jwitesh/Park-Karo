import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Off: every page here is per-user and behind login, so there is no shared static shell to prefetch.
  // With it on, the dev server logs a "crypto.getRandomValues while prerendering" warning on every navigation.
  partialPrefetching: false,
  reactCompiler: true,
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
