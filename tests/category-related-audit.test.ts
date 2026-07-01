import assert from "node:assert/strict";
import test from "node:test";

import {
  runCategoryRelatedCategoriesChecks,
  runDataAuditChecks,
} from "@/lib/data-audit/checks";
import type { AuditDataset } from "@/lib/data-audit/types";

function emptyDataset(overrides: Partial<AuditDataset> = {}): AuditDataset {
  return {
    products: [],
    productCategories: [],
    productImages: [],
    personalizationFields: [],
    productWishTemplates: [],
    wishTemplates: [],
    categories: [],
    categoryRelatedCategories: [],
    productFaqGroups: null,
    productFaqItems: null,
    faqGroups: null,
    faqItems: null,
    ...overrides,
  };
}

const categories: AuditDataset["categories"] = [
  {
    id: "gifts",
    slug: "bebeshki-podaratsi",
    category_type: "product",
    parent_id: null,
    is_visible: true,
  },
  {
    id: "albums",
    slug: "albumi",
    category_type: "product",
    parent_id: null,
    is_visible: true,
  },
  {
    id: "baby-albums",
    slug: "bebeshki-albumi",
    category_type: "product",
    parent_id: "albums",
    is_visible: true,
  },
  {
    id: "hidden",
    slug: "skrita",
    category_type: "product",
    parent_id: null,
    is_visible: false,
  },
  {
    id: "wedding",
    slug: "svatba",
    category_type: "occasion",
    parent_id: null,
    is_visible: true,
  },
];

test("category related audit reports info when table is unavailable", () => {
  const issues = runCategoryRelatedCategoriesChecks(
    emptyDataset({ categoryRelatedCategories: null }),
  );

  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.severity, "info");
  assert.equal(issues[0]?.code, "category_related_categories_unavailable");
});

test("category related audit flags orphan related category links", () => {
  const issues = runCategoryRelatedCategoriesChecks(
    emptyDataset({
      categories,
      categoryRelatedCategories: [
        {
          category_id: "missing-source",
          related_category_id: "baby-albums",
        },
        {
          category_id: "gifts",
          related_category_id: "missing-target",
        },
      ],
    }),
  );

  assert.ok(
    issues.some((issue) => issue.code === "category_related_orphan_source"),
  );
  assert.ok(
    issues.some((issue) => issue.code === "category_related_orphan_target"),
  );
});

test("category related audit flags self-link", () => {
  const issues = runCategoryRelatedCategoriesChecks(
    emptyDataset({
      categories,
      categoryRelatedCategories: [
        {
          category_id: "gifts",
          related_category_id: "gifts",
        },
      ],
    }),
  );

  assert.ok(issues.some((issue) => issue.code === "category_related_self_link"));
});

test("category related audit warns for hidden target", () => {
  const issues = runCategoryRelatedCategoriesChecks(
    emptyDataset({
      categories,
      categoryRelatedCategories: [
        {
          category_id: "gifts",
          related_category_id: "hidden",
        },
      ],
    }),
  );

  const hiddenWarning = issues.find(
    (issue) => issue.code === "category_related_hidden_target",
  );
  assert.equal(hiddenWarning?.severity, "warning");
  assert.match(hiddenWarning?.message ?? "", /skrita/i);
});

test("category related audit warns for direct child target", () => {
  const issues = runCategoryRelatedCategoriesChecks(
    emptyDataset({
      categories,
      categoryRelatedCategories: [
        {
          category_id: "albums",
          related_category_id: "baby-albums",
        },
      ],
    }),
  );

  const childWarning = issues.find(
    (issue) => issue.code === "category_related_direct_child_target",
  );
  assert.equal(childWarning?.severity, "warning");
  assert.match(childWarning?.message ?? "", /bebeshki-albumi/i);
});

test("category related audit flags occasion and type mismatch targets", () => {
  const issues = runCategoryRelatedCategoriesChecks(
    emptyDataset({
      categories,
      categoryRelatedCategories: [
        {
          category_id: "gifts",
          related_category_id: "wedding",
        },
      ],
    }),
  );

  assert.ok(
    issues.some((issue) => issue.code === "category_related_occasion_target"),
  );
  assert.ok(
    issues.some((issue) => issue.code === "category_related_type_mismatch"),
  );
});

test("category related audit flags duplicate links", () => {
  const issues = runCategoryRelatedCategoriesChecks(
    emptyDataset({
      categories,
      categoryRelatedCategories: [
        {
          category_id: "gifts",
          related_category_id: "baby-albums",
        },
        {
          category_id: "gifts",
          related_category_id: "baby-albums",
        },
      ],
    }),
  );

  assert.ok(
    issues.some((issue) => issue.code === "category_related_duplicate_link"),
  );
});

test("runDataAuditChecks includes category related link stats", () => {
  const report = runDataAuditChecks(
    emptyDataset({
      categories,
      categoryRelatedCategories: [
        {
          category_id: "gifts",
          related_category_id: "baby-albums",
        },
      ],
    }),
  );

  assert.equal(report.stats.category_related_links, 1);
});
