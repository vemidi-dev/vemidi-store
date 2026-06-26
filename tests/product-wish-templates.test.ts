import assert from "node:assert/strict";
import test from "node:test";

import type { WishTemplate } from "@/lib/product-personalization";
import {
  buildWishTemplateOccasionFilters,
  filterStorefrontWishTemplates,
  shouldShowWishOccasionFilters,
} from "@/lib/product-wish-templates";

const templates: WishTemplate[] = [
  {
    id: "w1",
    body: "Честит рожден ден!",
    occasions: [{ id: "birthday", name: "Рожден ден" }],
  },
  {
    id: "w2",
    body: "За сватба.",
    occasions: [{ id: "wedding", name: "Сватба" }],
  },
  {
    id: "w3",
    body: "Универсално пожелание.",
    occasions: [],
  },
  {
    id: "w4",
    body: "Още за рожден ден.",
    occasions: [{ id: "birthday", name: "Рожден ден" }],
  },
];

test("buildWishTemplateOccasionFilters returns unique sorted occasions", () => {
  assert.deepEqual(buildWishTemplateOccasionFilters(templates), [
    { id: "birthday", name: "Рожден ден" },
    { id: "wedding", name: "Сватба" },
  ]);
});

test("shouldShowWishOccasionFilters hides filter row for 0 or 1 occasion", () => {
  assert.equal(shouldShowWishOccasionFilters([]), false);
  assert.equal(
    shouldShowWishOccasionFilters([{ id: "birthday", name: "Рожден ден" }]),
    false,
  );
  assert.equal(
    shouldShowWishOccasionFilters([
      { id: "birthday", name: "Рожден ден" },
      { id: "wedding", name: "Сватба" },
    ]),
    true,
  );
});

test("filterStorefrontWishTemplates keeps unassigned wishes in all view only", () => {
  assert.deepEqual(
    filterStorefrontWishTemplates(templates, "all").map((wish) => wish.id),
    ["w1", "w2", "w3", "w4"],
  );

  assert.deepEqual(
    filterStorefrontWishTemplates(templates, "birthday").map((wish) => wish.id),
    ["w1", "w4"],
  );

  assert.deepEqual(
    filterStorefrontWishTemplates(templates, "wedding").map((wish) => wish.id),
    ["w2"],
  );
});
