import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

const DISALLOW_PATHS = [
  "/admin/",
  "/account",
  "/checkout",
  "/cart",
  "/thank-you",
  "/login",
  "/campaign-checkout",
  "/auth/",
];

export function buildRobotsConfig(siteUrl = getSiteUrl()): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOW_PATHS,
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl.origin,
  };
}

export default function robots(): MetadataRoute.Robots {
  return buildRobotsConfig();
}
