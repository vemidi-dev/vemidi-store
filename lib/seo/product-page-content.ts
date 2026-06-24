import {
  normalizeSeoPlainText,
  truncateSeoDescription,
} from "@/lib/seo/seo-text";
import type { Product } from "@/lib/catalog";

function trimVisibleText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export function resolveProductMetaTitle(product: Product): string {
  return trimVisibleText(product.meta_title) ?? product.title;
}

export function resolveProductOgTitle(
  product: Product,
  metaTitle: string,
): string {
  return trimVisibleText(product.og_title) ?? metaTitle;
}

export function resolveProductOgDescription(
  product: Product,
  metaDescription: string | undefined,
): string | undefined {
  const fromAdmin = normalizeSeoPlainText(product.og_description);
  return fromAdmin || metaDescription;
}

export function resolveAdminProductMetaDescription(
  product: Product,
): string | undefined {
  const fromAdmin = normalizeSeoPlainText(product.meta_description);
  if (!fromAdmin) {
    return undefined;
  }

  return truncateSeoDescription(fromAdmin) || fromAdmin;
}
