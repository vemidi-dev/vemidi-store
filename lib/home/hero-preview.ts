import type { ResolvedSiteMedia } from "@/lib/content/site-media-types";

export function resolveHomeHeroPreview(image: ResolvedSiteMedia): ResolvedSiteMedia {
  if (image.source === "uploaded") return image;
  const preview = process.env.HOME_HERO_PREVIEW_IMAGE;
  if (process.env.VERCEL_ENV !== "production" && (preview === "christmas" || preview === "christmas-snowflakes")) {
    return {
      src: preview === "christmas-snowflakes" ? "/assets/home-hero-christmas-snowflakes.webp" : "/assets/home-hero-christmas.webp",
      alt: "Коледни дървени подаръци VeMiDi Crafts: фенер, поставка за салфетки, подложки и свещник",
      source: "fallback",
    };
  }
  return image;
}
