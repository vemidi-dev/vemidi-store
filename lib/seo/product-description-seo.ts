import type { Product } from "@/lib/catalog";

import {
  normalizeSeoPlainText,
  SEO_META_DESCRIPTION_MAX_LENGTH,
  SEO_META_DESCRIPTION_MIN_LENGTH,
  truncateSeoDescription,
} from "@/lib/seo/seo-text";

export type ProductSeoContext = {
  primaryCategory?: {
    name: string;
    slug: string;
  } | null;
};

function appendSentence(parts: string[], sentence: string): void {
  const normalized = normalizeSeoPlainText(sentence);
  if (!normalized) {
    return;
  }

  parts.push(normalized.endsWith(".") ? normalized : `${normalized}.`);
}

function buildProductDescriptionFallback(
  product: Product,
  context?: ProductSeoContext,
): string {
  const parts: string[] = [];

  appendSentence(parts, product.title);

  const category = context?.primaryCategory;
  if (category) {
    appendSentence(
      parts,
      `Ръчно изработен продукт от категория „${category.name}“`,
    );
  }

  if (product.customizable || product.hasPersonalizationOptions) {
    appendSentence(parts, "Възможност за персонализация");
  } else if (product.hasColorOptions) {
    appendSentence(parts, "Избор на цвят при поръчка");
  }

  const fulfillmentNote = normalizeSeoPlainText(product.fulfillmentNote);
  if (fulfillmentNote) {
    appendSentence(parts, fulfillmentNote);
  } else if (product.fulfillmentType === "made_to_order") {
    appendSentence(parts, "Изработка по поръчка");
  } else if (product.fulfillmentType === "stocked" && product.orderable) {
    appendSentence(parts, "В наличност");
  }

  const badge = normalizeSeoPlainText(product.cardBadge);
  if (badge) {
    appendSentence(parts, badge);
  }

  appendSentence(parts, "Поръчайте от VeMiDi crafts");

  return normalizeSeoPlainText(parts.join(" "));
}

/**
 * Meta / OG / Twitter description — normalized, word-safe length, unique fallback.
 */
export function buildProductMetaDescription(
  product: Product,
  context?: ProductSeoContext,
): string | undefined {
  const fromAdmin = normalizeSeoPlainText(product.meta_description);
  if (fromAdmin) {
    return truncateSeoDescription(fromAdmin) || fromAdmin;
  }

  const fromSource = truncateSeoDescription(
    product.description,
    SEO_META_DESCRIPTION_MAX_LENGTH,
  );

  if (fromSource.length >= SEO_META_DESCRIPTION_MIN_LENGTH) {
    return fromSource;
  }

  const fallbackParts: string[] = [];
  if (fromSource) {
    fallbackParts.push(fromSource);
  }

  fallbackParts.push(buildProductDescriptionFallback(product, context));

  const composed = truncateSeoDescription(
    fallbackParts.join(" "),
    SEO_META_DESCRIPTION_MAX_LENGTH,
  );

  return composed || undefined;
}

/**
 * JSON-LD Product description — normalized plain text from the same source as meta.
 * Uses the full body when it is substantive; otherwise reuses the composed meta fallback.
 */
export function buildProductSchemaDescription(
  product: Product,
  context?: ProductSeoContext,
): string {
  const normalizedBody = normalizeSeoPlainText(product.description);
  if (normalizedBody.length >= SEO_META_DESCRIPTION_MIN_LENGTH) {
    return normalizedBody;
  }

  const metaFallback = buildProductMetaDescription(product, context);
  if (metaFallback) {
    return metaFallback;
  }

  return normalizedBody || normalizeSeoPlainText(product.title);
}
