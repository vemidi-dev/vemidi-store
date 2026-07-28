import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  ADMIN_CATEGORY_GROUP_LABELS,
  filterCategoriesByType,
  getAdminCategoryGroupLabel,
  groupCategoriesByType,
} from "@/lib/admin/category-groups";
import { resolvePersonalizationDetailsOpen } from "@/lib/product-personalization-default";
import { resolveReadyProductCta } from "@/lib/product-ready-cta";
import type { Product } from "@/lib/catalog";

test("category group helper labels and filters", () => {
  assert.equal(getAdminCategoryGroupLabel("material"), "Заготовки и материали");
  assert.equal(ADMIN_CATEGORY_GROUP_LABELS.product, "Категории");

  const categories = [
    { id: "1", categoryType: "product" as const, name: "Кутии" },
    { id: "2", categoryType: "material" as const, name: "Плочи" },
    { id: "3", category_type: "occasion" as const, name: "Сватба" },
  ];

  assert.equal(filterCategoriesByType(categories, "material").length, 1);
  assert.equal(groupCategoriesByType(categories).length, 3);
});

test("resolveReadyProductCta requires admin flag", () => {
  const target = {
    id: "ready-1",
    slug: "ready",
    productCode: "VM-1",
    title: "Готов продукт",
    description: "",
    price: 10,
    images: [],
    fulfillmentType: "made_to_order" as const,
    availabilityLabel: "В наличност",
    orderable: true,
  } satisfies Product;

  assert.equal(
    resolveReadyProductCta(
      { showReadyProductCta: false, readyProductCtaLabel: null, readyProductCtaProductId: null },
      [target],
      new Map([[target.id, target]]),
    ),
    null,
  );

  const resolved = resolveReadyProductCta(
    {
      showReadyProductCta: true,
      readyProductCtaLabel: "Виж примера",
      readyProductCtaProductId: target.id,
    },
    [],
    new Map([[target.id, target]]),
  );

  assert.equal(resolved?.label, "Виж примера");
  assert.equal(resolved?.product.id, "ready-1");
});

test("resolvePersonalizationDetailsOpen keeps material layout closed by default", () => {
  assert.equal(
    resolvePersonalizationDetailsOpen(null, true, true),
    false,
  );
  assert.equal(
    resolvePersonalizationDetailsOpen(null, false, true),
    true,
  );
  assert.equal(resolvePersonalizationDetailsOpen(true, true, false), true);
});

test("related product picker supports searchable single mode and material filter", () => {
  const picker = readFileSync(
    new URL("../components/admin/related-product-picker.tsx", import.meta.url),
    "utf8",
  );
  const merchandising = readFileSync(
    new URL("../components/admin/product-merchandising-fields.tsx", import.meta.url),
    "utf8",
  );

  assert.match(picker, /mode === "single"/);
  assert.match(picker, /type=\{mode === "single" \? "radio" : "checkbox"\}/);
  assert.match(picker, /materialCategoryId/);
  assert.match(picker, /getAdminCategoryFilterLabel\("material"\)/);
  assert.match(picker, /formatEur\(product\.price\)/);

  assert.match(merchandising, /Свързани продукти/);
  assert.match(merchandising, /Готов вариант/);
  assert.match(merchandising, /mode="single"/);
  assert.match(merchandising, /readyProductCtaProductId/);
});
