import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapNormalizedProductImportToMutation,
} from "@/lib/admin/product-json-import-v2/map-to-mutation";
import type {
  ImportableProduct,
  NormalizedProductImportV2,
  ProductImportPreviewStatus,
  ProductJsonImportIssue,
  ProductJsonImportSyncValidationResult,
  ProductJsonImportValidationResult,
  ResolvedImportCategory,
} from "@/lib/admin/product-json-import-v2/types";

function issue(
  code: string,
  message: string,
  severity: ProductJsonImportIssue["severity"],
  slug?: string,
): ProductJsonImportIssue {
  return { code, message, severity, slug };
}

export function allowsPrimaryImportCategory(categoryType: string) {
  return categoryType === "product" || categoryType === "material";
}

function resolvePreviewStatus(
  errors: ProductJsonImportIssue[],
  warnings: ProductJsonImportIssue[],
): ProductImportPreviewStatus {
  if (errors.length > 0) {
    return "error";
  }
  if (warnings.length > 0) {
    return "warning";
  }
  return "ready";
}

function collectCategorySlugs(products: NormalizedProductImportV2[]) {
  const slugs = new Set<string>();
  for (const product of products) {
    for (const slug of product.categorySlugs) {
      slugs.add(slug);
    }
    slugs.add(product.primaryCategorySlug);
  }
  return [...slugs];
}

export async function loadResolvedImportCategories(
  supabase: SupabaseClient,
  slugs: string[],
): Promise<{ categories: Map<string, ResolvedImportCategory>; error: string | null }> {
  if (slugs.length === 0) {
    return { categories: new Map(), error: null };
  }

  const { data, error } = await supabase
    .from("categories")
    .select("id,slug,category_type")
    .in("slug", slugs);

  if (error) {
    return {
      categories: new Map(),
      error: "Неуспешна проверка на категориите.",
    };
  }

  const categories = new Map<string, ResolvedImportCategory>();
  for (const row of data ?? []) {
    const slug = String(row.slug ?? "").trim().toLowerCase();
    if (!slug) {
      continue;
    }
    categories.set(slug, {
      id: String(row.id),
      slug,
      categoryType: String(row.category_type ?? ""),
    });
  }

  return { categories, error: null };
}

export async function loadExistingProductImportSlugs(
  supabase: SupabaseClient,
  slugs: string[],
): Promise<{ existingSlugs: Set<string>; error: string | null }> {
  if (slugs.length === 0) {
    return { existingSlugs: new Set(), error: null };
  }

  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .in("slug", slugs);

  if (error) {
    return {
      existingSlugs: new Set(),
      error: "Неуспешна проверка на SEO адресите.",
    };
  }

  const existingSlugs = new Set<string>();
  for (const row of data ?? []) {
    const slug = String(row.slug ?? "").trim().toLowerCase();
    if (slug) {
      existingSlugs.add(slug);
    }
  }

  return { existingSlugs, error: null };
}

function validateProductCategoriesAsync(
  product: NormalizedProductImportV2,
  categories: Map<string, ResolvedImportCategory>,
): ProductJsonImportIssue[] {
  const errors: ProductJsonImportIssue[] = [];
  const slug = product.slug;

  for (const categorySlug of product.categorySlugs) {
    if (!categories.has(categorySlug)) {
      errors.push(
        issue(
          "CATEGORY_NOT_FOUND",
          `Категорията „${categorySlug}" не съществува.`,
          "error",
          slug,
        ),
      );
    }
  }

  const primary = categories.get(product.primaryCategorySlug);
  if (!primary) {
    errors.push(
      issue(
        "PRIMARY_CATEGORY_NOT_FOUND",
        `Основната категория „${product.primaryCategorySlug}" не съществува.`,
        "error",
        slug,
      ),
    );
    return errors;
  }

  if (!allowsPrimaryImportCategory(primary.categoryType)) {
    errors.push(
      issue(
        "INVALID_PRIMARY_CATEGORY",
        `Основната категория „${product.primaryCategorySlug}" трябва да е от тип product или material.`,
        "error",
        slug,
      ),
    );
  }

  return errors;
}

function buildImportableProduct(
  product: NormalizedProductImportV2,
  categories: Map<string, ResolvedImportCategory>,
): ImportableProduct | null {
  const categoryIds = product.categorySlugs.map((slug) => categories.get(slug)?.id ?? "");
  const primaryCategoryId = categories.get(product.primaryCategorySlug)?.id ?? "";
  if (!categoryIds.every(Boolean) || !primaryCategoryId) {
    return null;
  }

  return {
    normalized: product,
    payload: mapNormalizedProductImportToMutation(product),
    categoryIds,
    primaryCategoryId,
  };
}

export async function applyAsyncProductJsonImportValidation(
  supabase: SupabaseClient,
  syncResult: ProductJsonImportSyncValidationResult,
): Promise<ProductJsonImportValidationResult> {
  const previews = syncResult.previews.map((preview) => ({
    ...preview,
    errors: [...preview.errors],
    warnings: [...preview.warnings],
  }));
  const fileErrors = [...syncResult.fileErrors];
  const importableProducts: ImportableProduct[] = [];

  if (syncResult.normalizedProducts.length === 0) {
    return {
      ...syncResult,
      previews,
      fileErrors,
      importableProducts,
    };
  }

  const slugs = syncResult.normalizedProducts.map((product) => product.slug);
  const categorySlugs = collectCategorySlugs(syncResult.normalizedProducts);

  const [slugLookup, categoryLookup] = await Promise.all([
    loadExistingProductImportSlugs(supabase, slugs),
    loadResolvedImportCategories(supabase, categorySlugs),
  ]);

  if (slugLookup.error) {
    fileErrors.push(issue("SLUG_LOOKUP_FAILED", slugLookup.error, "error"));
  }
  if (categoryLookup.error) {
    fileErrors.push(issue("CATEGORY_LOOKUP_FAILED", categoryLookup.error, "error"));
  }

  for (const preview of previews) {
    const product = syncResult.normalizedProducts.find((entry) => entry.slug === preview.slug);
    if (!product) {
      continue;
    }

    if (slugLookup.existingSlugs.has(product.slug)) {
      preview.errors.push(
        issue(
          "SLUG_TAKEN",
          `SEO адресът „${product.slug}" вече съществува.`,
          "error",
          product.slug,
        ),
      );
    }

    preview.errors.push(
      ...validateProductCategoriesAsync(product, categoryLookup.categories),
    );
    preview.status = resolvePreviewStatus(preview.errors, preview.warnings);

    if (preview.errors.length === 0) {
      const importable = buildImportableProduct(product, categoryLookup.categories);
      if (importable) {
        importableProducts.push(importable);
      }
    }
  }

  const ok =
    fileErrors.length === 0 &&
    previews.every((preview) => preview.errors.length === 0);

  return {
    ok,
    importKey: syncResult.importKey,
    fileErrors,
    fileWarnings: syncResult.fileWarnings,
    previews,
    normalizedProducts: syncResult.normalizedProducts,
    importableProducts,
  };
}

export async function validateProductJsonImportWithDb(
  supabase: SupabaseClient,
  syncResult: ProductJsonImportSyncValidationResult,
): Promise<ProductJsonImportValidationResult> {
  return applyAsyncProductJsonImportValidation(supabase, syncResult);
}
