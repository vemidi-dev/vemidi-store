import { siteConfig } from "@/config/site";
import type { Product } from "@/lib/catalog";
import { getCategoryDisplayLabel } from "@/lib/category-hierarchy";
import {
  isProductStorefrontPublished,
  type ProductPublicationStatus,
} from "@/lib/product-publication";
import { getProductPath } from "@/lib/product-url";
import {
  isProductCatalogVisible,
  type ProductVisibility,
} from "@/lib/product-visibility";
import { buildProductMetaDescription } from "@/lib/seo/product-description-seo";
import { normalizeSeoPlainText } from "@/lib/seo/seo-text";
import type { StorefrontCategory, StorefrontProduct } from "@/lib/storefront/types";

export type GoogleMerchantAvailability =
  | "in_stock"
  | "out_of_stock";

export type GoogleMerchantFeedItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  availability: GoogleMerchantAvailability;
  price: string;
  condition: "new";
  brand: string;
  mpn: string | null;
  identifierExists: false;
  productType: string | null;
};

export type GoogleMerchantFeedInput = {
  siteUrl: URL | string;
  products: StorefrontProduct[];
  categories?: StorefrontCategory[];
  title?: string;
  description?: string;
};

/** Escape text for XML element/attribute content. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function formatMerchantPriceEur(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "0.00 EUR";
  }
  return `${amount.toFixed(2)} EUR`;
}

/**
 * Map storefront availability/fulfillment to Google Merchant values.
 * Both stocked and made_to_order orderable products → in_stock.
 * preorder/backorder require availability_date and are deferred.
 */
export function mapMerchantAvailability(
  product: Pick<Product, "orderable" | "fulfillmentType" | "soldOut">,
): GoogleMerchantAvailability {
  if (!product.orderable || product.soldOut) {
    return "out_of_stock";
  }
  if (product.fulfillmentType === "stocked" || product.fulfillmentType === "made_to_order") {
    return "in_stock";
  }
  return "out_of_stock";
}

export function resolveMerchantProductId(
  product: Pick<Product, "id" | "productCode">,
): string {
  const code = product.productCode?.trim();
  return code || product.id;
}

export function resolveMerchantDescription(
  product: Product,
  primaryCategory?: { name: string; slug: string } | null,
): string {
  const fromVisible = normalizeSeoPlainText(product.description);
  if (fromVisible) {
    return fromVisible;
  }

  const composed = buildProductMetaDescription(
    product,
    primaryCategory ? { primaryCategory } : undefined,
  );
  if (composed) {
    return composed;
  }

  return normalizeSeoPlainText(product.title) || product.title;
}

export function resolveAbsoluteUrl(
  value: string | null | undefined,
  siteUrl: URL,
): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const resolved = new URL(trimmed, siteUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

export type MerchantFeedEligibility = {
  status?: ProductPublicationStatus | null;
  visibility?: ProductVisibility | null;
};

export function isMerchantFeedEligibleProduct(
  product: MerchantFeedEligibility,
): boolean {
  return (
    isProductStorefrontPublished(product.status ?? "published") &&
    isProductCatalogVisible(product.visibility)
  );
}

export function filterMerchantFeedProducts<
  T extends MerchantFeedEligibility,
>(products: T[]): T[] {
  return products.filter(isMerchantFeedEligibleProduct);
}

function resolveProductType(
  product: StorefrontProduct,
  categories: StorefrontCategory[],
): string | null {
  if (!product.primaryCategoryId || categories.length === 0) {
    return null;
  }

  const category = categories.find(
    (entry) => entry.id === product.primaryCategoryId,
  );
  if (!category) {
    return null;
  }

  return getCategoryDisplayLabel(categories, category).replace(
    /\s*\/\s*/g,
    " > ",
  );
}

function resolvePrimaryCategoryContext(
  product: StorefrontProduct,
  categories: StorefrontCategory[],
): { name: string; slug: string } | null {
  if (!product.primaryCategoryId) {
    return null;
  }
  const category = categories.find(
    (entry) => entry.id === product.primaryCategoryId,
  );
  return category ? { name: category.name, slug: category.slug } : null;
}

/**
 * Build one feed item. Returns null when required image_link is missing
 * (products without a usable image are skipped from the feed).
 */
export function buildGoogleMerchantFeedItem(
  product: StorefrontProduct,
  siteUrl: URL,
  categories: StorefrontCategory[] = [],
): GoogleMerchantFeedItem | null {
  const imageCandidates = product.images
    .map((image) => resolveAbsoluteUrl(image.src, siteUrl))
    .filter((src): src is string => Boolean(src));

  const imageLink = imageCandidates[0] ?? null;
  if (!imageLink) {
    return null;
  }

  const primaryCategory = resolvePrimaryCategoryContext(product, categories);
  const productCode = product.productCode?.trim() || null;

  return {
    id: resolveMerchantProductId(product),
    title: product.title.trim() || product.slug,
    description: resolveMerchantDescription(product, primaryCategory),
    link: new URL(getProductPath(product.slug), siteUrl).toString(),
    imageLink,
    additionalImageLinks: imageCandidates.slice(1),
    availability: mapMerchantAvailability(product),
    price: formatMerchantPriceEur(product.price),
    condition: "new",
    brand: siteConfig.name,
    mpn: productCode,
    identifierExists: false,
    productType: resolveProductType(product, categories),
  };
}

function renderGTag(name: string, value: string): string {
  return `<g:${name}>${escapeXml(value)}</g:${name}>`;
}

export function renderGoogleMerchantItemXml(item: GoogleMerchantFeedItem): string {
  const lines = [
    "<item>",
    renderGTag("id", item.id),
    renderGTag("title", item.title),
    renderGTag("description", item.description),
    renderGTag("link", item.link),
    renderGTag("image_link", item.imageLink),
    ...item.additionalImageLinks.map((url) =>
      renderGTag("additional_image_link", url),
    ),
    renderGTag("availability", item.availability),
    renderGTag("price", item.price),
    renderGTag("condition", item.condition),
    renderGTag("brand", item.brand),
  ];

  if (item.mpn) {
    lines.push(renderGTag("mpn", item.mpn));
  }

  lines.push(renderGTag("identifier_exists", "false"));

  if (item.productType) {
    lines.push(renderGTag("product_type", item.productType));
  }

  lines.push("</item>");
  return lines.join("");
}

export function buildGoogleMerchantFeedXml(
  input: GoogleMerchantFeedInput,
): string {
  const siteUrl =
    typeof input.siteUrl === "string"
      ? new URL(input.siteUrl)
      : input.siteUrl;
  const categories = input.categories ?? [];
  const eligible = filterMerchantFeedProducts(input.products)
    .slice()
    .sort((left, right) => {
      const leftKey = resolveMerchantProductId(left);
      const rightKey = resolveMerchantProductId(right);
      return leftKey.localeCompare(rightKey, "en");
    });

  const items = eligible
    .map((product) => buildGoogleMerchantFeedItem(product, siteUrl, categories))
    .filter((item): item is GoogleMerchantFeedItem => item !== null);

  const channelTitle = input.title?.trim() || siteConfig.name;
  const channelDescription =
    input.description?.trim() || siteConfig.description;
  const channelLink = new URL("/", siteUrl).toString();

  const itemXml = items.map(renderGoogleMerchantItemXml).join("");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
    `<channel>`,
    `<title>${escapeXml(channelTitle)}</title>`,
    `<link>${escapeXml(channelLink)}</link>`,
    `<description>${escapeXml(channelDescription)}</description>`,
    itemXml,
    `</channel>`,
    `</rss>`,
  ].join("");
}

export const GOOGLE_MERCHANT_FEED_CONTENT_TYPE =
  "application/xml; charset=utf-8";
