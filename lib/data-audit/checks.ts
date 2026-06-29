import type {
  AuditCategoryRow,
  AuditDataset,
  AuditIssue,
  AuditProductRow,
  AuditReport,
} from "@/lib/data-audit/types";

function productLabel(product: Pick<AuditProductRow, "id" | "slug" | "name">) {
  const slug = String(product.slug ?? "").trim();
  if (slug) {
    return `product ${slug}`;
  }

  const name = String(product.name ?? "").trim();
  if (name) {
    return `product "${name}" (${product.id})`;
  }

  return `product ${product.id}`;
}

export function findDuplicateSlugs(
  items: Array<{ id: string; slug: string | null }>,
  label: string,
): AuditIssue[] {
  const bySlug = new Map<string, string[]>();

  for (const item of items) {
    const slug = String(item.slug ?? "").trim().toLowerCase();
    if (!slug) {
      continue;
    }

    const ids = bySlug.get(slug) ?? [];
    ids.push(item.id);
    bySlug.set(slug, ids);
  }

  const issues: AuditIssue[] = [];
  for (const [slug, ids] of bySlug) {
    if (ids.length > 1) {
      issues.push({
        severity: "critical",
        code: "duplicate_slug",
        message: `${label} duplicate slug "${slug}" (${ids.length} records)`,
      });
    }
  }

  return issues;
}

function findDuplicateCategorySlugs(categories: AuditCategoryRow[]): AuditIssue[] {
  const byKey = new Map<string, string[]>();

  for (const category of categories) {
    const slug = String(category.slug ?? "").trim().toLowerCase();
    if (!slug) {
      continue;
    }

    const key = `${category.category_type}::${slug}`;
    const ids = byKey.get(key) ?? [];
    ids.push(category.id);
    byKey.set(key, ids);
  }

  const issues: AuditIssue[] = [];
  for (const [key, ids] of byKey) {
    if (ids.length <= 1) {
      continue;
    }

    const [categoryType, slug] = key.split("::");
    issues.push({
      severity: "critical",
      code: "duplicate_category_slug",
      message: `category duplicate slug "${slug}" in type ${categoryType} (${ids.length} records)`,
    });
  }

  return issues;
}

function isPublished(product: AuditProductRow) {
  return product.status === "published";
}

export function runDataAuditChecks(dataset: AuditDataset): AuditReport {
  const issues: AuditIssue[] = [];
  const stats: Record<string, number> = {
    products: dataset.products.length,
    published_products: dataset.products.filter(isPublished).length,
    product_wish_template_links: dataset.productWishTemplates.length,
    wish_templates: dataset.wishTemplates.length,
    categories: dataset.categories.length,
  };

  issues.push({
    severity: "info",
    code: "product_wish_templates_count",
    message: `product_wish_templates link count: ${dataset.productWishTemplates.length}`,
  });

  const wishTemplatesByProduct = new Map<string, number>();
  for (const link of dataset.productWishTemplates) {
    wishTemplatesByProduct.set(
      link.product_id,
      (wishTemplatesByProduct.get(link.product_id) ?? 0) + 1,
    );
  }

  const productsAllowingWishes = new Set<string>();
  for (const field of dataset.personalizationFields) {
    if (field.allows_wish_templates) {
      productsAllowingWishes.add(field.product_id);
    }
  }

  for (const productId of productsAllowingWishes) {
    if ((wishTemplatesByProduct.get(productId) ?? 0) > 0) {
      continue;
    }

    const product = dataset.products.find((row) => row.id === productId);
    issues.push({
      severity: "critical",
      code: "product_wishes_enabled_without_assignments",
      message: `${product ? productLabel(product) : `product ${productId}`} allows wish templates but has no product_wish_templates links`,
    });
  }

  const assignedWishTemplateIds = new Set(
    dataset.productWishTemplates.map((link) => link.wish_template_id),
  );
  for (const wish of dataset.wishTemplates) {
    if (!wish.is_active || assignedWishTemplateIds.has(wish.id)) {
      continue;
    }

    issues.push({
      severity: "warning",
      code: "active_wish_unassigned",
      message: `active wish template ${wish.id} is not assigned to any product`,
    });
  }

  const categoriesByProduct = new Map<string, Set<string>>();
  for (const link of dataset.productCategories) {
    const categoryIds = categoriesByProduct.get(link.product_id) ?? new Set<string>();
    categoryIds.add(link.category_id);
    categoriesByProduct.set(link.product_id, categoryIds);
  }

  const imageCountByProduct = new Map<string, number>();
  for (const image of dataset.productImages) {
    imageCountByProduct.set(
      image.product_id,
      (imageCountByProduct.get(image.product_id) ?? 0) + 1,
    );
  }

  for (const product of dataset.products) {
    if (!isPublished(product)) {
      continue;
    }

    const label = productLabel(product);

    if (!String(product.slug ?? "").trim()) {
      issues.push({
        severity: "critical",
        code: "published_without_slug",
        message: `${label} published without slug`,
      });
    }

    if ((categoriesByProduct.get(product.id)?.size ?? 0) === 0) {
      issues.push({
        severity: "critical",
        code: "published_without_category",
        message: `${label} published without category`,
      });
    }

    if (!String(product.primary_category_id ?? "").trim()) {
      issues.push({
        severity: "critical",
        code: "published_without_primary_category",
        message: `${label} published without primary category`,
      });
    }

    const hasImageUrl = Boolean(String(product.image_url ?? "").trim());
    const galleryCount = imageCountByProduct.get(product.id) ?? 0;
    if (!hasImageUrl && galleryCount === 0) {
      issues.push({
        severity: "warning",
        code: "published_without_image",
        message: `${label} published without image or gallery image`,
      });
    }

    if (!String(product.subtitle ?? "").trim()) {
      issues.push({
        severity: "warning",
        code: "published_without_subtitle",
        message: `${label} published without subtitle (publish validation requires it)`,
      });
    }
  }

  issues.push(...findDuplicateSlugs(dataset.products, "product"));
  issues.push(...findDuplicateCategorySlugs(dataset.categories));

  const categoryIds = new Set(dataset.categories.map((category) => category.id));
  for (const category of dataset.categories) {
    if (!category.parent_id) {
      continue;
    }

    if (categoryIds.has(category.parent_id)) {
      continue;
    }

    issues.push({
      severity: "critical",
      code: "category_missing_parent",
      message: `category ${category.slug || category.id} references missing parent ${category.parent_id}`,
    });
  }

  const productsWithCategories = new Set(
    dataset.productCategories.map((link) => link.category_id),
  );
  for (const category of dataset.categories) {
    if (category.category_type !== "product" || category.is_visible === false) {
      continue;
    }

    if (productsWithCategories.has(category.id)) {
      continue;
    }

    issues.push({
      severity: "warning",
      code: "visible_category_without_products",
      message: `visible product category ${category.slug || category.id} has no linked products`,
    });
  }

  const productIds = new Set(dataset.products.map((product) => product.id));
  const wishTemplateIds = new Set(dataset.wishTemplates.map((wish) => wish.id));

  for (const link of dataset.productWishTemplates) {
    if (!productIds.has(link.product_id)) {
      issues.push({
        severity: "critical",
        code: "orphan_product_wish_product",
        message: `product_wish_templates references missing product ${link.product_id}`,
      });
    }

    if (!wishTemplateIds.has(link.wish_template_id)) {
      issues.push({
        severity: "critical",
        code: "orphan_product_wish_template",
        message: `product_wish_templates references missing wish template ${link.wish_template_id}`,
      });
    }
  }

  for (const link of dataset.productCategories) {
    if (!productIds.has(link.product_id)) {
      issues.push({
        severity: "critical",
        code: "orphan_product_category_product",
        message: `product_categories references missing product ${link.product_id}`,
      });
    }

    if (!categoryIds.has(link.category_id)) {
      issues.push({
        severity: "critical",
        code: "orphan_product_category_category",
        message: `product_categories references missing category ${link.category_id}`,
      });
    }
  }

  if (dataset.productFaqGroups) {
    const faqGroupIds = new Set((dataset.faqGroups ?? []).map((group) => group.id));
    for (const link of dataset.productFaqGroups) {
      if (!productIds.has(link.product_id)) {
        issues.push({
          severity: "critical",
          code: "orphan_product_faq_group_product",
          message: `product_faq_groups references missing product ${link.product_id}`,
        });
      }

      if (!faqGroupIds.has(link.group_id)) {
        issues.push({
          severity: "critical",
          code: "orphan_product_faq_group",
          message: `product_faq_groups references missing faq group ${link.group_id}`,
        });
      }
    }
  }

  if (dataset.productFaqItems) {
    const faqItemIds = new Set((dataset.faqItems ?? []).map((item) => item.id));
    for (const link of dataset.productFaqItems) {
      if (!productIds.has(link.product_id)) {
        issues.push({
          severity: "critical",
          code: "orphan_product_faq_item_product",
          message: `product_faq_items references missing product ${link.product_id}`,
        });
      }

      if (!faqItemIds.has(link.faq_item_id)) {
        issues.push({
          severity: "critical",
          code: "orphan_product_faq_item",
          message: `product_faq_items references missing faq item ${link.faq_item_id}`,
        });
      }
    }
  }

  return { issues, stats };
}
