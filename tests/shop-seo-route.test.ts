import assert from "node:assert/strict";
import test from "node:test";

import {
  buildShopMetadata,
  isShopFaceted,
  parseShopSearchParams,
  resolveProductsPageRedirect,
  resolveShopOccasionRedirect,
  resolveShopProductCategoryRedirect,
} from "@/lib/seo/shop-route";
import type { StorefrontCategory } from "@/lib/storefront/types";

const categories: StorefrontCategory[] = [
  {
    id: "cat-1",
    name: "Кутии",
    slug: "kutii",
    category_type: "product",
    parent_id: null,
    show_on_home: true,
    home_sort_order: 1,
    card_description: null,
    createdAt: null,
  },
  {
    id: "cat-2",
    name: "Сватба",
    slug: "svatba",
    category_type: "occasion",
    parent_id: null,
    show_on_home: true,
    home_sort_order: 2,
    card_description: null,
    createdAt: null,
  },
];

test("bare shop is indexable with canonical /shop", () => {
  const metadata = buildShopMetadata({}, categories);
  assert.equal(metadata.alternates?.canonical, "/shop");
  assert.deepEqual(metadata.robots, { index: true, follow: true });
});

test("shop search query is noindex with canonical /shop", () => {
  const metadata = buildShopMetadata({ q: "подарък" }, categories);
  assert.equal(metadata.alternates?.canonical, "/shop");
  assert.deepEqual(metadata.robots, { index: false, follow: true });
});

test("empty shop query params are noindex", () => {
  for (const params of [{ q: "" }, { sort: "" }, { product: "" }] as const) {
    const parsed = parseShopSearchParams(params);
    const metadata = buildShopMetadata(params, categories);
    assert.equal(
      isShopFaceted(params, parsed, categories),
      true,
      JSON.stringify(params),
    );
    assert.equal(metadata.alternates?.canonical, "/shop");
    assert.deepEqual(metadata.robots, { index: false, follow: true });
  }
});

test("valid sole occasion selector is not faceted because it redirects", () => {
  const params = { occasion: "svatba" };
  const parsed = parseShopSearchParams(params);
  assert.equal(isShopFaceted(params, parsed, categories), false);
  assert.equal(
    resolveShopOccasionRedirect(params, parsed, categories),
    "/occasions/svatba",
  );
});

test("only valid occasion redirects to /occasions/{slug}", () => {
  const params = { occasion: "svatba" };
  const parsed = parseShopSearchParams(params);
  assert.equal(
    resolveShopOccasionRedirect(params, parsed, categories),
    "/occasions/svatba",
  );
});

test("legacy occasion category redirects to /occasions/{slug}", () => {
  const params = { category: "svatba" };
  const parsed = parseShopSearchParams(params);
  assert.equal(
    resolveShopOccasionRedirect(params, parsed, categories),
    "/occasions/svatba",
  );
});

test("invalid occasion slug does not redirect", () => {
  const params = { occasion: "missing-slug" };
  const parsed = parseShopSearchParams(params);
  assert.equal(resolveShopOccasionRedirect(params, parsed, categories), null);
  assert.equal(isShopFaceted(params, parsed, categories), true);
});

test("occasion with extra filters does not redirect", () => {
  const params = { occasion: "svatba", sort: "price-asc" };
  const parsed = parseShopSearchParams(params);
  assert.equal(resolveShopOccasionRedirect(params, parsed, categories), null);
  assert.equal(isShopFaceted(params, parsed, categories), true);
});

test("shop sort filter is noindex", () => {
  const params = { sort: "featured" };
  assert.equal(
    isShopFaceted(params, parseShopSearchParams(params), categories),
    true,
  );
});

test("shop unknown params are noindex", () => {
  const params = { utm_source: "ads" };
  assert.equal(
    isShopFaceted(params, parseShopSearchParams(params), categories),
    true,
  );
});

test("only valid product category redirects to /categories/{slug}", () => {
  const params = { product: "kutii" };
  const parsed = parseShopSearchParams(params);
  assert.equal(
    resolveShopProductCategoryRedirect(params, parsed, categories),
    "/categories/kutii",
  );
});

test("legacy product category param redirects to /categories/{slug}", () => {
  const params = { category: "kutii" };
  const parsed = parseShopSearchParams(params);
  assert.equal(
    resolveShopProductCategoryRedirect(params, parsed, categories),
    "/categories/kutii",
  );
});

test("invalid product category slug does not redirect", () => {
  const params = { product: "missing-slug" };
  const parsed = parseShopSearchParams(params);
  assert.equal(resolveShopProductCategoryRedirect(params, parsed, categories), null);
  assert.equal(isShopFaceted(params, parsed, categories), true);
});

test("empty product category param does not redirect", () => {
  const params = { product: "" };
  const parsed = parseShopSearchParams(params);
  assert.equal(resolveShopProductCategoryRedirect(params, parsed, categories), null);
  assert.equal(isShopFaceted(params, parsed, categories), true);
});

test("product category with extra filters does not redirect", () => {
  const params = { product: "kutii", sort: "price-asc" };
  const parsed = parseShopSearchParams(params);
  assert.equal(resolveShopProductCategoryRedirect(params, parsed, categories), null);
  assert.equal(isShopFaceted(params, parsed, categories), true);
});

test("legacy occasion category is not treated as product redirect", () => {
  const params = { category: "svatba" };
  const parsed = parseShopSearchParams(params);
  assert.equal(resolveShopProductCategoryRedirect(params, parsed, categories), null);
});

test("products page redirects product categories to /categories/{slug}", () => {
  assert.equal(
    resolveProductsPageRedirect({ product: "kutii" }, categories),
    "/categories/kutii",
  );
});

test("products page redirects legacy product categories to /categories/{slug}", () => {
  assert.equal(
    resolveProductsPageRedirect({ category: "kutii" }, categories),
    "/categories/kutii",
  );
});

test("products page redirects occasion filters to /occasions/{slug}", () => {
  assert.equal(
    resolveProductsPageRedirect({ occasion: "svatba" }, categories),
    "/occasions/svatba",
  );
});

test("products page bare redirect goes to /shop", () => {
  assert.equal(resolveProductsPageRedirect({}, categories), "/shop");
});
