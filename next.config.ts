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
  // Keep the dev server isolated from `next build`; otherwise a build can replace
  // the server-action manifest while a local development session is running.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      ...(supabaseRemotePattern ? [supabaseRemotePattern] : []),
    ],
  },
};

export default nextConfig;
