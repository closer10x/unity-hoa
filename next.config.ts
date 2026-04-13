import type { NextConfig } from "next";

const supabaseHost = (() => {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!u) return null;
  try {
    return new URL(u).hostname;
  } catch {
    return null;
  }
})();

function stringWatchIgnores(prev: unknown): string[] {
  if (prev == null) return [];
  if (typeof prev === "string" && prev.length > 0) return [prev];
  if (Array.isArray(prev)) {
    return prev.filter(
      (x): x is string => typeof x === "string" && x.length > 0,
    );
  }
  return [];
}

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      const prevIgnored = config.watchOptions?.ignored;
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [...stringWatchIgnores(prevIgnored), "**/.cursor/**"],
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.cdn.filesafe.space",
        pathname: "/**",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
