import assert from "node:assert/strict";
import test from "node:test";

import { resolveBlogRecommendation } from "@/lib/blog-recommendations";
import type { BlogPostRow } from "@/lib/admin/types";
import type { StorefrontCatalog } from "@/lib/storefront/types";

const basePost: Pick<BlogPostRow, "cta_category_id" | "cta_link_label"> = {
  cta_category_id: "occasion-1",
  cta_link_label: "Вижте идеи за кръщене",
};

const catalog = {
  categories: [
    {
      id: "occasion-1",
      name: "Кръщене",
      slug: "krashtene",
      category_type: "occasion",
    },
    {
      id: "category-1",
      name: "Пликове за пари",
      slug: "plikove-za-pari",
      category_type: "product",
    },
  ],
  products: [
    {
      id: "product-1",
      slug: "album",
      categorySlugs: ["krashtene"],
    },
    {
      id: "product-2",
      slug: "plik",
      categorySlugs: ["plikove-za-pari"],
    },
  ],
} as StorefrontCatalog;

test("blog recommendation links occasion categories to the occasions hub", () => {
  const recommendation = resolveBlogRecommendation(basePost, catalog);

  assert.equal(recommendation?.href, "/povodi/krashtene");
  assert.equal(recommendation?.products.length, 0);
});

test("blog recommendation links product categories to the category hub", () => {
  const recommendation = resolveBlogRecommendation(
    {
      cta_category_id: "category-1",
      cta_link_label: "Вижте пликовете",
    },
    catalog,
  );

  assert.equal(recommendation?.href, "/categorii/plikove-za-pari");
  assert.equal(recommendation?.products.length, 0);
});

test("blog recommendation uses manually selected products in saved order", () => {
  const recommendation = resolveBlogRecommendation(
    basePost,
    catalog,
    ["product-2", "product-1"],
  );

  assert.deepEqual(
    recommendation?.products.map((product) => product.id),
    ["product-2", "product-1"],
  );
});

test("blog recommendation can show products without a link button", () => {
  const recommendation = resolveBlogRecommendation(
    { cta_category_id: null, cta_link_label: null },
    catalog,
    ["product-1"],
  );

  assert.equal(recommendation?.href, null);
  assert.equal(recommendation?.linkLabel, null);
  assert.equal(recommendation?.products[0]?.id, "product-1");
});

test("blog recommendation is hidden without link or selected products", () => {
  assert.equal(
    resolveBlogRecommendation(
      { cta_category_id: "occasion-1", cta_link_label: null },
      catalog,
    ),
    null,
  );
  assert.equal(
    resolveBlogRecommendation(
      { cta_category_id: null, cta_link_label: "Вижте още" },
      catalog,
    ),
    null,
  );
});
