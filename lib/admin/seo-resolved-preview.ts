import { siteConfig } from "@/config/site";
import type { Product } from "@/lib/catalog";
import {
  buildCategoryMetaDescription,
  buildOccasionMetaDescription,
} from "@/lib/seo/category-description-seo";
import {
  resolveCategoryMetaTitle,
  resolveCategoryOgDescription,
  resolveCategoryOgTitle,
} from "@/lib/seo/category-page-content";
import {
  buildProductMetaDescription,
  type ProductSeoContext,
} from "@/lib/seo/product-description-seo";
import {
  resolveProductMetaTitle,
  resolveProductOgDescription,
  resolveProductOgTitle,
} from "@/lib/seo/product-page-content";
import type { StorefrontCategory } from "@/lib/storefront/types";

export type ResolvedSeoPreview = {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  /** Layout title template note shown in admin (document title suffix). */
  documentTitleNote: string;
  /** Full document title as layout would render: `${metaTitle} | ${siteName}`. */
  documentTitlePreview: string;
};

export function buildDocumentTitlePreview(metaTitle: string): {
  documentTitleNote: string;
  documentTitlePreview: string;
} {
  const documentTitleNote = `| ${siteConfig.name}`;
  return {
    documentTitleNote,
    documentTitlePreview: `${metaTitle} ${documentTitleNote}`.trim(),
  };
}

type ProductSeoPreviewInput = {
  name: string;
  description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  fulfillmentType?: Product["fulfillmentType"];
  orderable?: boolean;
  customizable?: boolean;
  hasColorOptions?: boolean;
  hasPersonalizationOptions?: boolean;
  cardBadge?: string | null;
  fulfillmentNote?: string | null;
  primaryCategory?: ProductSeoContext["primaryCategory"];
};

function toPreviewProduct(input: ProductSeoPreviewInput): Product {
  return {
    id: "preview",
    slug: "preview",
    productCode: "PREVIEW",
    title: input.name.trim() || "Продукт",
    description: input.description?.trim() || "",
    price: 0,
    fulfillmentType: input.fulfillmentType ?? "made_to_order",
    availabilityLabel: "",
    orderable: input.orderable ?? true,
    images: [],
    meta_title: input.meta_title,
    meta_description: input.meta_description,
    og_title: input.og_title,
    og_description: input.og_description,
    customizable: input.customizable,
    hasColorOptions: input.hasColorOptions,
    hasPersonalizationOptions: input.hasPersonalizationOptions,
    cardBadge: input.cardBadge,
    fulfillmentNote: input.fulfillmentNote,
  };
}

/**
 * Resolved SEO values using the same storefront resolvers/fallbacks.
 * Empty admin meta fields still produce non-empty fallback titles/descriptions.
 */
export function resolveProductSeoPreview(
  input: ProductSeoPreviewInput,
): ResolvedSeoPreview {
  const product = toPreviewProduct(input);
  const context: ProductSeoContext | undefined = input.primaryCategory
    ? { primaryCategory: input.primaryCategory }
    : undefined;

  const metaTitle = resolveProductMetaTitle(product);
  const metaDescription =
    buildProductMetaDescription(product, context) ??
    product.title;
  const ogTitle = resolveProductOgTitle(product, metaTitle);
  const ogDescription =
    resolveProductOgDescription(product, metaDescription) ?? metaDescription;
  const documentTitle = buildDocumentTitlePreview(metaTitle);

  return {
    metaTitle,
    metaDescription,
    ogTitle,
    ogDescription,
    ...documentTitle,
  };
}

type CategorySeoPreviewInput = {
  name: string;
  category_type: StorefrontCategory["category_type"];
  card_description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
};

function toPreviewCategory(input: CategorySeoPreviewInput): StorefrontCategory {
  return {
    id: "preview",
    name: input.name.trim() || "Категория",
    slug: "preview",
    category_type: input.category_type,
    parent_id: null,
    show_on_home: false,
    home_sort_order: 0,
    card_description: input.card_description ?? null,
    createdAt: null,
    meta_title: input.meta_title,
    meta_description: input.meta_description,
    og_title: input.og_title,
    og_description: input.og_description,
  };
}

/**
 * Resolved SEO for categories / occasions / materials — same fallback chain as storefront.
 */
export function resolveCategorySeoPreview(
  input: CategorySeoPreviewInput,
): ResolvedSeoPreview {
  const category = toPreviewCategory(input);
  const metaTitle = resolveCategoryMetaTitle(category);
  const metaDescription =
    category.category_type === "occasion"
      ? buildOccasionMetaDescription(category)
      : buildCategoryMetaDescription(category);
  const ogTitle = resolveCategoryOgTitle(category, metaTitle);
  const ogDescription = resolveCategoryOgDescription(category, metaDescription);
  const documentTitle = buildDocumentTitlePreview(metaTitle);

  return {
    metaTitle,
    metaDescription,
    ogTitle,
    ogDescription,
    ...documentTitle,
  };
}
