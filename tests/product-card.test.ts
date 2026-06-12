import assert from "node:assert/strict";
import test from "node:test";

import type { Product } from "@/lib/catalog";
import {
  getProductCardCtaLabel,
  normalizeProductCardBadge,
  productHasSelectableOptions,
  resolveProductCardStatusLabel,
} from "@/lib/product-card";

const baseProduct: Product = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "gift-box",
  productCode: "VM-000099",
  title: "Подаръчна кутия",
  description: "Описание",
  price: 29.9,
  images: [{ src: "https://example.com/image.webp", alt: "Подаръчна кутия" }],
};

test("normalizeProductCardBadge accepts known labels and rejects unknown values", () => {
  assert.equal(normalizeProductCardBadge("Ново"), "Ново");
  assert.equal(normalizeProductCardBadge("  По поръчка "), "По поръчка");
  assert.equal(normalizeProductCardBadge("Промо"), null);
  assert.equal(normalizeProductCardBadge(""), null);
});

test("productHasSelectableOptions detects colors, personalization and legacy customizable flag", () => {
  assert.equal(productHasSelectableOptions(baseProduct), false);
  assert.equal(
    productHasSelectableOptions({ ...baseProduct, hasColorOptions: true }),
    true,
  );
  assert.equal(
    productHasSelectableOptions({ ...baseProduct, hasPersonalizationOptions: true }),
    true,
  );
  assert.equal(
    productHasSelectableOptions({ ...baseProduct, customizable: true }),
    true,
  );
});

test("getProductCardCtaLabel switches between options and product view", () => {
  assert.equal(getProductCardCtaLabel(baseProduct), "Виж продукта");
  assert.equal(
    getProductCardCtaLabel({ ...baseProduct, hasColorOptions: true }),
    "Избери опции",
  );
});

test("resolveProductCardStatusLabel returns only configured badges", () => {
  assert.equal(resolveProductCardStatusLabel(baseProduct), null);
  assert.equal(
    resolveProductCardStatusLabel({ ...baseProduct, cardBadge: "Най-продавано" }),
    "Най-продавано",
  );
});
