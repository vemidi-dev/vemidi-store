import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { adminFormFields } from "@/lib/admin/form-fields";
import {
  buildCategoryRelatedCategoryRows,
  parseRelatedCategoryIdsFromFormData,
  validateCategoryRelatedTargets,
  type CategoryRelatedValidationCategory,
} from "@/lib/admin/category-related";

const categories: CategoryRelatedValidationCategory[] = [
  {
    id: "gifts",
    name: "Бебешки подаръци",
    category_type: "product",
    parent_id: null,
  },
  {
    id: "albums",
    name: "Албуми",
    category_type: "product",
    parent_id: null,
  },
  {
    id: "baby-albums",
    name: "Бебешки албуми",
    category_type: "product",
    parent_id: "albums",
  },
  {
    id: "wedding",
    name: "Сватба",
    category_type: "occasion",
    parent_id: null,
  },
];

test("category_related_categories.sql defines table, PK, self-link check, and RLS policies", () => {
  const sql = readFileSync(
    new URL("../supabase/category_related_categories.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /create table if not exists public\.category_related_categories/i);
  assert.match(sql, /primary key \(category_id, related_category_id\)/i);
  assert.match(sql, /category_related_not_self/i);
  assert.match(sql, /check \(category_id <> related_category_id\)/i);
  assert.match(sql, /category_related_categories_related_idx/i);
  assert.match(sql, /category_related_categories_source_sort_idx/i);
  assert.match(sql, /category_related_categories_public_read/i);
  assert.match(sql, /category_related_categories_admin_write/i);
  assert.match(sql, /public\.is_admin\(auth\.uid\(\)\)/i);
});

test("parseRelatedCategoryIdsFromFormData deduplicates selected ids", () => {
  const formData = new FormData();
  formData.append(adminFormFields.category.relatedCategoryIds, "baby-albums");
  formData.append(adminFormFields.category.relatedCategoryIds, "baby-albums");
  formData.append(adminFormFields.category.relatedCategoryIds, "albums");

  assert.deepEqual(parseRelatedCategoryIdsFromFormData(formData), [
    "baby-albums",
    "albums",
  ]);
});

test("buildCategoryRelatedCategoryRows assigns sort_order 10, 20, 30", () => {
  assert.deepEqual(
    buildCategoryRelatedCategoryRows("gifts", ["baby-albums", "albums"]),
    [
      {
        category_id: "gifts",
        related_category_id: "baby-albums",
        sort_order: 10,
      },
      {
        category_id: "gifts",
        related_category_id: "albums",
        sort_order: 20,
      },
    ],
  );
});

test("validateCategoryRelatedTargets rejects self-link", () => {
  const error = validateCategoryRelatedTargets(
    "gifts",
    ["gifts"],
    categories,
    "product",
  );

  assert.match(error ?? "", /себе си/i);
});

test("validateCategoryRelatedTargets rejects direct child as related target", () => {
  const error = validateCategoryRelatedTargets(
    "albums",
    ["baby-albums"],
    categories,
    "product",
  );

  assert.match(error ?? "", /подкатегория/i);
});

test("validateCategoryRelatedTargets rejects occasion target for product source", () => {
  const error = validateCategoryRelatedTargets(
    "gifts",
    ["wedding"],
    categories,
    "product",
  );

  assert.match(error ?? "", /повод/i);
});

test("validateCategoryRelatedTargets allows valid cross-link", () => {
  assert.equal(
    validateCategoryRelatedTargets("gifts", ["baby-albums"], categories, "product"),
    null,
  );
});

test("category actions parse and sync related categories", () => {
  const source = readFileSync(new URL("../app/admin/actions.ts", import.meta.url), "utf8");

  assert.match(source, /parseRelatedCategoryIdsFromFormData/);
  assert.match(source, /validateCategoryRelatedTargets/);
  assert.match(source, /syncCategoryRelatedCategories/);
  assert.match(
    source,
    /async function createCategory[\s\S]*?parseRelatedCategoryIdsFromFormData/,
  );
  assert.match(
    source,
    /async function updateCategory[\s\S]*?parseRelatedCategoryIdsFromFormData/,
  );
});
