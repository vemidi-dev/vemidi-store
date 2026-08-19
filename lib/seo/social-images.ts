import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

export type SeoSocialImage = {
  src: string;
  alt: string;
};

export const OG_DEFAULTS = {
  locale: "bg_BG" as const,
  siteName: siteConfig.name,
};

export function appendOpenGraphAndTwitterImages(
  metadata: Metadata,
  image?: SeoSocialImage | null,
): Metadata {
  if (!image?.src) {
    return metadata;
  }

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [{ url: image.src, alt: image.alt }],
    },
    twitter: {
      ...metadata.twitter,
      card: "summary_large_image",
      images: [image.src],
    },
  };
}
