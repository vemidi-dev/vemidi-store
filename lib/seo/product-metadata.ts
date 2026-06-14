import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { getProductPath } from "@/lib/product-url";
import type { Product } from "@/lib/catalog";

export function buildProductPageMetadata(
  product: Product,
  canonicalSlug: string,
): Metadata {
  const description = product.description.slice(0, 160).trim();
  const primaryImage = product.images.find((image) => image.src)?.src;
  const canonicalPath = getProductPath(canonicalSlug);

  return {
    title: product.title,
    description: description || undefined,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "website",
      locale: "bg_BG",
      siteName: siteConfig.name,
      title: product.title,
      description: description || undefined,
      url: canonicalPath,
      images: primaryImage
        ? [{ url: primaryImage, alt: product.title }]
        : undefined,
    },
    twitter: {
      card: primaryImage ? "summary_large_image" : "summary",
      title: product.title,
      description: description || undefined,
      images: primaryImage ? [primaryImage] : undefined,
    },
  };
}
