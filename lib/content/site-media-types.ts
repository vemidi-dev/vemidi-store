export const SITE_MEDIA_KEYS = [
  "home.hero",
  "home.atelier",
  "shop.hero",
  "categories.hero",
  "occasions.hero",
  "blog.hero",
  "events.hero",
  "about.hero",
  "checkout.thank_you",
] as const;

export type SiteMediaKey = (typeof SITE_MEDIA_KEYS)[number];

export type SiteMediaRow = {
  key: SiteMediaKey;
  label: string;
  section: string;
  sort_order: number;
  image_url: string | null;
  image_alt: string | null;
  updated_at: string;
};

export type ResolvedSiteMedia = {
  src: string;
  alt: string;
  source: "uploaded" | "fallback";
};
