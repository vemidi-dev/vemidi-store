import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeCampaignSelection,
  filterPromotionProducts,
  findOverlappingActivePromotions,
  formatPromotionLifecycleStatus,
  getPromotionLifecycleStatus,
  isValidPercentageDiscount,
  promotionPeriodsOverlap,
  validatePromotionPeriod,
  type PromotionProductOption,
} from "@/lib/promotion-admin";
import type { ProductPromotionRow } from "@/lib/product-pricing";

const basePromotion: ProductPromotionRow = {
  id: "promo-1",
  product_id: "product-1",
  campaign_id: null,
  name: "Пролет",
  discount_type: "percentage",
  discount_value: 20,
  starts_at: "2026-06-01T00:00:00.000Z",
  ends_at: "2026-07-01T00:00:00.000Z",
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
};

const products: PromotionProductOption[] = [
  {
    id: "product-1",
    name: "Кутия А",
    price: 40,
    imageUrl: null,
    productCategoryIds: ["cat-product"],
    occasionCategoryIds: ["cat-occasion"],
    categorySummary: "Кутии, Сватба",
    isSoldOut: false,
  },
  {
    id: "product-2",
    name: "Кутия Б",
    price: 25,
    imageUrl: null,
    productCategoryIds: ["cat-product"],
    occasionCategoryIds: [],
    categorySummary: "Кутии",
    isSoldOut: true,
  },
];

test("getPromotionLifecycleStatus covers active, future and expired campaigns", () => {
  assert.equal(
    getPromotionLifecycleStatus(basePromotion, new Date("2026-06-15T12:00:00.000Z")),
    "active",
  );
  assert.equal(
    getPromotionLifecycleStatus(basePromotion, new Date("2026-05-15T12:00:00.000Z")),
    "planned",
  );
  assert.equal(
    getPromotionLifecycleStatus(basePromotion, new Date("2026-08-01T12:00:00.000Z")),
    "ended",
  );
  assert.equal(
    getPromotionLifecycleStatus(
      { ...basePromotion, is_active: false },
      new Date("2026-06-15T12:00:00.000Z"),
    ),
    "inactive",
  );
});

test("formatPromotionLifecycleStatus returns Bulgarian labels", () => {
  assert.equal(
    formatPromotionLifecycleStatus(basePromotion, new Date("2026-06-15T12:00:00.000Z")),
    "Активна",
  );
});

test("isValidPercentageDiscount rejects invalid percentages", () => {
  assert.equal(isValidPercentageDiscount(10), true);
  assert.equal(isValidPercentageDiscount(0), false);
  assert.equal(isValidPercentageDiscount(101), false);
});

test("validatePromotionPeriod requires end after start", () => {
  assert.equal(
    validatePromotionPeriod("2026-06-01T00:00:00.000Z", "2026-07-01T00:00:00.000Z"),
    null,
  );
  assert.match(
    validatePromotionPeriod("2026-07-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z") ?? "",
    /Крайната дата/,
  );
});

test("promotionPeriodsOverlap follows active promotion half-open intervals", () => {
  assert.equal(
    promotionPeriodsOverlap(
      "2026-06-01T00:00:00.000Z",
      "2026-07-01T00:00:00.000Z",
      "2026-06-20T00:00:00.000Z",
      "2026-08-01T00:00:00.000Z",
    ),
    true,
  );
  assert.equal(
    promotionPeriodsOverlap(
      "2026-06-01T00:00:00.000Z",
      "2026-07-01T00:00:00.000Z",
      "2026-07-01T00:00:00.000Z",
      "2026-08-01T00:00:00.000Z",
    ),
    false,
  );
});

test("findOverlappingActivePromotions respects inactive future campaigns", () => {
  const overlaps = findOverlappingActivePromotions(
    "product-1",
    {
      startsAt: "2026-06-10T00:00:00.000Z",
      endsAt: "2026-06-20T00:00:00.000Z",
      isActive: true,
    },
    [basePromotion],
  );

  assert.equal(overlaps.length, 1);
  assert.equal(
    findOverlappingActivePromotions(
      "product-1",
      {
        startsAt: "2026-06-10T00:00:00.000Z",
        endsAt: "2026-06-20T00:00:00.000Z",
        isActive: false,
      },
      [basePromotion],
    ).length,
    0,
  );
});

test("analyzeCampaignSelection flags invalid final prices and overlaps", () => {
  const invalidPrice = analyzeCampaignSelection({
    products,
    selectedIds: ["product-1"],
    discountPercentage: 0.004,
    period: {
      startsAt: "2026-08-01T00:00:00.000Z",
      endsAt: "2026-09-01T00:00:00.000Z",
      isActive: true,
    },
    existingPromotions: [],
  });
  assert.equal(invalidPrice.issues[0]?.reason, "invalid_price");

  const overlap = analyzeCampaignSelection({
    products,
    selectedIds: ["product-1"],
    discountPercentage: 10,
    period: {
      startsAt: "2026-06-10T00:00:00.000Z",
      endsAt: "2026-06-20T00:00:00.000Z",
      isActive: true,
    },
    existingPromotions: [basePromotion],
  });
  assert.equal(overlap.issues[0]?.reason, "overlap");
  assert.deepEqual(overlap.issues[0]?.overlapWith, ["Пролет"]);
});

test("filterPromotionProducts keeps selected products out of browse-only filters", () => {
  const filtered = filterPromotionProducts(products, {
    query: "Кутия",
    productCategoryId: "cat-product",
    occasionCategoryId: "all",
    status: "active",
  });
  assert.deepEqual(filtered.map((product) => product.id), ["product-1"]);

  const selectedOnly = filterPromotionProducts(products, {
    onlyIds: new Set(["product-2"]),
  });
  assert.deepEqual(selectedOnly.map((product) => product.id), ["product-2"]);
});
