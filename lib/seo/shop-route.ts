import type { Metadata } from "next";

import {
  CATALOG_OCCASION_FILTER_PARAM,
  CATALOG_PRODUCT_CATEGORY_FILTER_PARAM,
  isCatalogProductCategoryFilterSlug,
  LEGACY_CATALOG_OCCASION_FILTER_PARAM,
  LEGACY_CATALOG_PRODUCT_CATEGORY_FILTER_PARAM,
  readCatalogOccasionFilterValue,
  readCatalogProductCategoryFilterValue,
} from "@/lib/catalog-filter-query-params";
import { resolveCanonicalProductCategorySlug } from "@/lib/category-slug-aliases";
import { getCategoryPath, getOccasionPath } from "@/lib/category-url";
import {
  findVisibleOccasionCategoryBySlug,
  findVisibleProductCategoryBySlug,
} from "@/lib/category-visibility";
import {
  buildFacetedNoindexMetadata,
  buildIndexableMetadata,
} from "@/lib/seo/faceted-metadata";
import type { SeoSocialImage } from "@/lib/seo/social-images";
import type { StorefrontCategory } from "@/lib/storefront/types";

const SHOP_METADATA_BASE = {
  title: "Продукти",
  description:
    "Разгледайте ръчно изработени и персонализирани подаръци от VeMiDi crafts.",
} as const;

export const SHOP_KNOWN_PARAMS = new Set([
  CATALOG_PRODUCT_CATEGORY_FILTER_PARAM,
  CATALOG_OCCASION_FILTER_PARAM,
  LEGACY_CATALOG_PRODUCT_CATEGORY_FILTER_PARAM,
  LEGACY_CATALOG_OCCASION_FILTER_PARAM,
  "category",
  "price",
  "sort",
  "q",
  "personalization",
  "promotions",
]);

export type ParsedShopParams = {
  product: string;
  occasion: string;
  legacyCategory: string;
  price: string;
  sort: string;
  q: string;
  personalizationOnly: boolean;
  promotionsOnly: boolean;
  unknownParams: string[];
};

export function firstSearchParam(
  value: string | string[] | undefined,
): string {
  if (!value) {
    return "";
  }

  return (Array.isArray(value) ? value[0] ?? "" : value).trim();
}

export function parseShopSearchParams(
  params: Record<string, string | string[] | undefined>,
): ParsedShopParams {
  const unknownParams = Object.keys(params).filter(
    (key) => !SHOP_KNOWN_PARAMS.has(key),
  );

  return {
    product: readCatalogProductCategoryFilterValue(params),
    occasion: readCatalogOccasionFilterValue(params),
    legacyCategory: firstSearchParam(params.category),
    price: firstSearchParam(params.price),
    sort: firstSearchParam(params.sort),
    q: firstSearchParam(params.q),
    personalizationOnly: firstSearchParam(params.personalization) === "only",
    promotionsOnly: firstSearchParam(params.promotions) === "only",
    unknownParams,
  };
}

function findProductCategoryBySlug(
  categories: StorefrontCategory[],
  slug: string,
) {
  const canonicalSlug = resolveCanonicalProductCategorySlug(slug);
  return findVisibleProductCategoryBySlug(categories, canonicalSlug);
}

function findOccasionBySlug(
  categories: StorefrontCategory[],
  slug: string,
) {
  return findVisibleOccasionCategoryBySlug(categories, slug);
}

export function isOnlyOccasionSelector(
  params: Record<string, string | string[] | undefined>,
  parsed: ParsedShopParams,
): boolean {
  const keys = Object.keys(params);
  if (keys.length !== 1) {
    return false;
  }

  const onlyKey = keys[0];
  if (
    (onlyKey === LEGACY_CATALOG_OCCASION_FILTER_PARAM ||
      onlyKey === CATALOG_OCCASION_FILTER_PARAM) &&
    parsed.occasion
  ) {
    return true;
  }

  if (onlyKey === "category" && parsed.legacyCategory) {
    return true;
  }

  return false;
}

export function resolveShopOccasionRedirect(
  params: Record<string, string | string[] | undefined>,
  parsed: ParsedShopParams,
  categories: StorefrontCategory[],
): string | null {
  if (!isOnlyOccasionSelector(params, parsed)) {
    return null;
  }

  const slug = parsed.occasion || parsed.legacyCategory;
  const occasion = findOccasionBySlug(categories, slug);
  return occasion ? getOccasionPath(occasion.slug) : null;
}

export function isOnlyProductCategorySelector(
  params: Record<string, string | string[] | undefined>,
  parsed: ParsedShopParams,
): boolean {
  const keys = Object.keys(params);
  if (keys.length !== 1) {
    return false;
  }

  const onlyKey = keys[0];
  if (
    onlyKey !== LEGACY_CATALOG_PRODUCT_CATEGORY_FILTER_PARAM &&
    onlyKey !== CATALOG_PRODUCT_CATEGORY_FILTER_PARAM &&
    onlyKey !== "category"
  ) {
    return false;
  }

  if (
    (onlyKey === LEGACY_CATALOG_PRODUCT_CATEGORY_FILTER_PARAM ||
      onlyKey === CATALOG_PRODUCT_CATEGORY_FILTER_PARAM) &&
    !parsed.product
  ) {
    return false;
  }

  if (
    (onlyKey === LEGACY_CATALOG_PRODUCT_CATEGORY_FILTER_PARAM ||
      onlyKey === CATALOG_PRODUCT_CATEGORY_FILTER_PARAM) &&
    !isCatalogProductCategoryFilterSlug(parsed.product)
  ) {
    return false;
  }

  if (onlyKey === "category" && !parsed.legacyCategory) {
    return false;
  }

  return true;
}

export function resolveShopProductCategoryRedirect(
  params: Record<string, string | string[] | undefined>,
  parsed: ParsedShopParams,
  categories: StorefrontCategory[],
): string | null {
  if (!isOnlyProductCategorySelector(params, parsed)) {
    return null;
  }

  const slug = parsed.product || parsed.legacyCategory;
  const category = findProductCategoryBySlug(categories, slug);
  return category ? getCategoryPath(category.slug) : null;
}

export function resolveShopCategoryRedirect(
  params: Record<string, string | string[] | undefined>,
  parsed: ParsedShopParams,
  categories: StorefrontCategory[],
): string | null {
  return (
    resolveShopProductCategoryRedirect(params, parsed, categories) ??
    resolveShopOccasionRedirect(params, parsed, categories)
  );
}

export function isShopFaceted(
  params: Record<string, string | string[] | undefined>,
  parsed: ParsedShopParams,
  categories: StorefrontCategory[],
): boolean {
  if (Object.keys(params).length === 0) {
    return false;
  }

  if (resolveShopCategoryRedirect(params, parsed, categories)) {
    return false;
  }

  return true;
}

export function buildShopQueryString(parsed: ParsedShopParams): string {
  const queryParams = new URLSearchParams();

  if (parsed.product) {
    queryParams.set(CATALOG_PRODUCT_CATEGORY_FILTER_PARAM, parsed.product);
  }

  if (parsed.occasion) {
    queryParams.set(CATALOG_OCCASION_FILTER_PARAM, parsed.occasion);
  }

  if (!parsed.product && !parsed.occasion && parsed.legacyCategory) {
    queryParams.set("category", parsed.legacyCategory);
  }

  if (parsed.price) {
    queryParams.set("price", parsed.price);
  }

  if (parsed.sort) {
    queryParams.set("sort", parsed.sort);
  }

  if (parsed.q) {
    queryParams.set("q", parsed.q);
  }

  if (parsed.personalizationOnly) {
    queryParams.set("personalization", "only");
  }

  if (parsed.promotionsOnly) {
    queryParams.set("promotions", "only");
  }

  const query = queryParams.toString();
  return query ? `?${query}#product-grid` : "";
}

export function resolveProductsPageRedirect(
  params: Record<string, string | string[] | undefined>,
  categories: StorefrontCategory[],
): string {
  const parsed = parseShopSearchParams(params);
  const categoryRedirect = resolveShopProductCategoryRedirect(
    params,
    parsed,
    categories,
  );

  if (categoryRedirect) {
    return categoryRedirect;
  }

  const occasionRedirect = resolveShopOccasionRedirect(
    params,
    parsed,
    categories,
  );

  if (occasionRedirect) {
    return occasionRedirect;
  }

  return `/producti${buildShopQueryString(parsed)}`;
}

export function buildShopMetadata(
  params: Record<string, string | string[] | undefined>,
  categories: StorefrontCategory[],
  socialImage?: SeoSocialImage | null,
): Metadata {
  const parsed = parseShopSearchParams(params);

  if (resolveShopCategoryRedirect(params, parsed, categories)) {
    return {
      robots: { index: false, follow: true },
    };
  }

  if (isShopFaceted(params, parsed, categories)) {
    return buildFacetedNoindexMetadata("/producti", SHOP_METADATA_BASE);
  }

  return buildIndexableMetadata("/producti", SHOP_METADATA_BASE, socialImage);
}
