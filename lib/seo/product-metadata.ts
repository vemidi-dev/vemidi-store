import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { getProductPath } from "@/lib/product-url";
import type { Product } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site-url";
import {
  resolveProductMetaTitle,
  resolveProductOgDescription,
  resolveProductOgTitle,
} from "@/lib/seo/product-page-content";
import {
  buildProductMetaDescription,
  type ProductSeoContext,
} from "@/lib/seo/product-description-seo";

export function buildProductPageMetadata(
  product: Product,
  canonicalSlug: string,
  context?: ProductSeoContext,
): Metadata {
  const title = resolveProductMetaTitle(product);
  const description = buildProductMetaDescription(product, context);
  const ogTitle = resolveProductOgTitle(product, title);
  const ogDescription = resolveProductOgDescription(product, description);
  const primaryImage = product.images.find((image) => image.src)?.src;
  const canonicalPath = getProductPath(canonicalSlug);
  const canonicalUrl = new URL(canonicalPath, getSiteUrl()).toString();

  return {
    title,
    description: description || undefined,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      locale: "bg_BG",
      siteName: siteConfig.name,
      title: ogTitle,
      description: ogDescription || undefined,
      url: canonicalUrl,
      images: primaryImage
        ? [{ url: primaryImage, alt: title }]
        : undefined,
    },
    twitter: {
      card: primaryImage ? "summary_large_image" : "summary",
      title: ogTitle,
      description: ogDescription || undefined,
      images: primaryImage ? [primaryImage] : undefined,
    },
  };
}
