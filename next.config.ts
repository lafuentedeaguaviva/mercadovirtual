import type { NextConfig } from "next";

const getSupabaseHostname = (): string => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy-test-project.supabase.co";
  try {
    return new URL(url).hostname;
  } catch {
    return "dummy-test-project.supabase.co";
  }
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
