import type { NextConfig } from "next";

function getSupabaseRemotePattern() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(supabaseUrl);
    return {
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
      hostname: parsed.hostname,
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return null;
  }
}

const supabaseRemotePattern = getSupabaseRemotePattern();

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
  images: {
    remotePatterns: [
      ...(supabaseRemotePattern ? [supabaseRemotePattern] : []),
    ],
  },
};

export default nextConfig;
