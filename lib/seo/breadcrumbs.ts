import {
  CATEGORY_INDEX_PATH,
  OCCASION_INDEX_PATH,
  getCategoryPath,
  getOccasionPath,
} from "@/lib/category-url";
import { getChildCategories } from "@/lib/category-hierarchy";
import { getProductPath, PRODUCT_INDEX_PATH } from "@/lib/product-url";
import type { StorefrontCategory } from "@/lib/storefront/types";

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function buildAbsoluteUrl(path: string, siteUrl: URL): string {
  return new URL(path, siteUrl).toString();
}

export function dedupeBreadcrumbItems(items: BreadcrumbItem[]): BreadcrumbItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.name}::${item.path}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return item.name.trim().length > 0 && item.path.trim().length > 0;
  });
}

export function buildBreadcrumbListSchema(
  items: BreadcrumbItem[],
  siteUrl: URL,
) {
  const breadcrumbs = dedupeBreadcrumbItems(items);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildAbsoluteUrl(item.path, siteUrl),
    })),
  };
}

export function buildHomeBreadcrumb(): BreadcrumbItem {
  return { name: "Начало", path: "/" };
}

export function buildCategoryBreadcrumbItems(
  categories: StorefrontCategory[],
  category: StorefrontCategory,
): BreadcrumbItem[] {
  const parent = category.parent_id
    ? categories.find((entry) => entry.id === category.parent_id)
    : null;

  return dedupeBreadcrumbItems([
    buildHomeBreadcrumb(),
    { name: "Категории", path: CATEGORY_INDEX_PATH },
    ...(parent
      ? [{ name: parent.name, path: getCategoryPath(parent.slug) }]
      : []),
    { name: category.name, path: getCategoryPath(category.slug) },
  ]);
}

export function resolvePrimaryProductCategory(
  categories: StorefrontCategory[],
  productCategorySlugs: string[],
  primaryCategoryId?: string | null,
): StorefrontCategory | null {
  const matches = categories.filter(
    (category) =>
      category.category_type === "product" &&
      productCategorySlugs.includes(category.slug),
  );

  if (matches.length === 0) {
    return null;
  }

  if (primaryCategoryId) {
    const selected = matches.find((category) => category.id === primaryCategoryId);
    if (selected) {
      return selected;
    }
  }

  return (
    matches.find((category) => category.parent_id !== null) ??
    matches.sort(
      (left, right) => right.home_sort_order - left.home_sort_order,
    )[0]
  );
}

export function buildProductBreadcrumbItems(
  categories: StorefrontCategory[],
  product: {
    title: string;
    slug: string;
    categorySlugs: string[];
    primaryCategoryId?: string | null;
  },
): BreadcrumbItem[] {
  const category = resolvePrimaryProductCategory(
    categories,
    product.categorySlugs,
    product.primaryCategoryId,
  );

  if (!category) {
    return dedupeBreadcrumbItems([
      buildHomeBreadcrumb(),
      { name: "Продукти", path: PRODUCT_INDEX_PATH },
      { name: product.title, path: getProductPath(product.slug) },
    ]);
  }

  const parent = category.parent_id
    ? categories.find((entry) => entry.id === category.parent_id)
    : null;

  return dedupeBreadcrumbItems([
    buildHomeBreadcrumb(),
    { name: "Категории", path: CATEGORY_INDEX_PATH },
    ...(parent
      ? [{ name: parent.name, path: getCategoryPath(parent.slug) }]
      : []),
    { name: category.name, path: getCategoryPath(category.slug) },
    { name: product.title, path: getProductPath(product.slug) },
  ]);
}

export function buildOccasionBreadcrumbItems(
  occasion: Pick<StorefrontCategory, "name" | "slug">,
): BreadcrumbItem[] {
  return dedupeBreadcrumbItems([
    buildHomeBreadcrumb(),
    { name: "По повод", path: OCCASION_INDEX_PATH },
    { name: occasion.name, path: getOccasionPath(occasion.slug) },
  ]);
}

export function buildBlogPostBreadcrumbItems(post: {
  title: string;
  slug: string;
}): BreadcrumbItem[] {
  return dedupeBreadcrumbItems([
    buildHomeBreadcrumb(),
    { name: "Блог", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ]);
}

export function buildEventBreadcrumbItems(event: {
  title: string;
  slug: string;
}): BreadcrumbItem[] {
  return dedupeBreadcrumbItems([
    buildHomeBreadcrumb(),
    { name: "Събития", path: "/sabitiya" },
    { name: event.title, path: `/sabitiya/${event.slug}` },
  ]);
}

export function categoryHasChildCategories(
  categories: StorefrontCategory[],
  categoryId: string,
): boolean {
  return getChildCategories(categories, categoryId).length > 0;
}
