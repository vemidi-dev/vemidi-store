import type { CategoryRow, CategoryType, ProductRow } from "@/lib/admin/types";

export type SeoOverviewEntityKind =
  | "product"
  | "category"
  | "occasion"
  | "material";

export type SeoOverviewCompleteness = "complete" | "partial" | "missing";

export type SeoOverviewRow = {
  kind: SeoOverviewEntityKind;
  id: string;
  name: string;
  slug: string;
  metaTitlePresent: boolean;
  metaDescriptionPresent: boolean;
  metaDescriptionLength: number;
  ogTitlePresent: boolean;
  ogDescriptionPresent: boolean;
  /** Display label for robots_index; null for products (no column). */
  robotsIndexLabel: string | null;
  completeness: SeoOverviewCompleteness;
  editHref: string;
};

export type SeoOverviewSummary = {
  total: number;
  complete: number;
  partial: number;
  missing: number;
  missingMetaTitle: number;
  missingMetaDescription: number;
};

export function hasSeoText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function seoTextLength(value: string | null | undefined): number {
  if (typeof value !== "string") {
    return 0;
  }
  return value.trim().length;
}

/** Admin-facing robots_index label for categories/occasions/materials. */
export function formatRobotsIndexDisplay(
  robotsIndex: boolean | null | undefined,
): string {
  if (robotsIndex === true) {
    return "Индексирай";
  }
  if (robotsIndex === false) {
    return "Не индексирай";
  }
  return "Автоматично";
}

export function resolveSeoCompleteness(input: {
  metaTitlePresent: boolean;
  metaDescriptionPresent: boolean;
  ogTitlePresent: boolean;
  ogDescriptionPresent: boolean;
}): SeoOverviewCompleteness {
  const flags = [
    input.metaTitlePresent,
    input.metaDescriptionPresent,
    input.ogTitlePresent,
    input.ogDescriptionPresent,
  ];
  const presentCount = flags.filter(Boolean).length;
  if (presentCount === 0) {
    return "missing";
  }
  if (presentCount === flags.length) {
    return "complete";
  }
  return "partial";
}

export function categoryTypeToSeoOverviewKind(
  categoryType: CategoryType,
): Exclude<SeoOverviewEntityKind, "product"> {
  if (categoryType === "product") {
    return "category";
  }
  return categoryType;
}

export function makeProductSeoEditHref(productId: string): string {
  return `/admin?tab=products&editProduct=${encodeURIComponent(productId)}`;
}

export function makeCategorySeoEditHref(
  categoryId: string,
  categoryType: CategoryType,
): string {
  const params = new URLSearchParams({
    tab: "categories",
    categoryType,
  });
  return `/admin?${params.toString()}#category-edit-${categoryId}`;
}

export function buildProductSeoOverviewRow(
  product: Pick<
    ProductRow,
    | "id"
    | "name"
    | "slug"
    | "meta_title"
    | "meta_description"
    | "og_title"
    | "og_description"
  >,
): SeoOverviewRow {
  const metaTitlePresent = hasSeoText(product.meta_title);
  const metaDescriptionPresent = hasSeoText(product.meta_description);
  const ogTitlePresent = hasSeoText(product.og_title);
  const ogDescriptionPresent = hasSeoText(product.og_description);

  return {
    kind: "product",
    id: product.id,
    name: product.name,
    slug: product.slug,
    metaTitlePresent,
    metaDescriptionPresent,
    metaDescriptionLength: seoTextLength(product.meta_description),
    ogTitlePresent,
    ogDescriptionPresent,
    robotsIndexLabel: null,
    completeness: resolveSeoCompleteness({
      metaTitlePresent,
      metaDescriptionPresent,
      ogTitlePresent,
      ogDescriptionPresent,
    }),
    editHref: makeProductSeoEditHref(product.id),
  };
}

export function buildCategorySeoOverviewRow(
  category: Pick<
    CategoryRow,
    | "id"
    | "name"
    | "slug"
    | "category_type"
    | "meta_title"
    | "meta_description"
    | "og_title"
    | "og_description"
    | "robots_index"
  >,
): SeoOverviewRow {
  const metaTitlePresent = hasSeoText(category.meta_title);
  const metaDescriptionPresent = hasSeoText(category.meta_description);
  const ogTitlePresent = hasSeoText(category.og_title);
  const ogDescriptionPresent = hasSeoText(category.og_description);

  return {
    kind: categoryTypeToSeoOverviewKind(category.category_type),
    id: category.id,
    name: category.name,
    slug: category.slug,
    metaTitlePresent,
    metaDescriptionPresent,
    metaDescriptionLength: seoTextLength(category.meta_description),
    ogTitlePresent,
    ogDescriptionPresent,
    robotsIndexLabel: formatRobotsIndexDisplay(category.robots_index),
    completeness: resolveSeoCompleteness({
      metaTitlePresent,
      metaDescriptionPresent,
      ogTitlePresent,
      ogDescriptionPresent,
    }),
    editHref: makeCategorySeoEditHref(category.id, category.category_type),
  };
}

export function summarizeSeoOverview(rows: SeoOverviewRow[]): SeoOverviewSummary {
  return {
    total: rows.length,
    complete: rows.filter((row) => row.completeness === "complete").length,
    partial: rows.filter((row) => row.completeness === "partial").length,
    missing: rows.filter((row) => row.completeness === "missing").length,
    missingMetaTitle: rows.filter((row) => !row.metaTitlePresent).length,
    missingMetaDescription: rows.filter((row) => !row.metaDescriptionPresent)
      .length,
  };
}

export function seoOverviewKindLabel(kind: SeoOverviewEntityKind): string {
  switch (kind) {
    case "product":
      return "Продукт";
    case "category":
      return "Категория";
    case "occasion":
      return "Повод";
    case "material":
      return "Заготовка";
  }
}
