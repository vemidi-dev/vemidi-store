import assert from "node:assert/strict";
import test from "node:test";

import { getCategoryPath } from "@/lib/category-url";
import {
  getLegacyProductCategoryRedirect,
  isLegacyProductCategorySlug,
  LEGACY_PRODUCT_CATEGORY_SLUGS,
  normalizeProductCategoryQueryParams,
  resolveCanonicalProductCategorySlug,
} from "@/lib/category-slug-aliases";
import {
  resolveSeoRedirectTarget,
  SEO_REDIRECT_STATUS,
} from "@/lib/seo/middleware-redirects";

function params(input: Record<string, string>): URLSearchParams {
  return new URLSearchParams(input);
}

test("legacy slug maps to canonical product category slug", () => {
  assert.equal(resolveCanonicalProductCategorySlug("plik-za-pari"), "plikove-za-pari");
  assert.equal(resolveCanonicalProductCategorySlug("plikove-za-pari"), "plikove-za-pari");
  assert.equal(getLegacyProductCategoryRedirect("plik-za-pari"), "plikove-za-pari");
  assert.equal(getLegacyProductCategoryRedirect("plikove-za-pari"), null);
});

test("getCategoryPath emits canonical slug for legacy category input", () => {
  assert.equal(getCategoryPath("plik-za-pari"), "/categorii/plikove-za-pari");
  assert.equal(getCategoryPath("plikove-za-pari"), "/categorii/plikove-za-pari");
});

test("legacy category path redirects to canonical category path", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/categories/plik-za-pari", new URLSearchParams()),
    { pathname: "/categorii/plikove-za-pari" },
  );
});

test("legacy category path preserves safe query params", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget(
      "/categories/plik-za-pari",
      params({ occasion: "svatba" }),
    ),
    {
      pathname: "/categorii/plikove-za-pari",
      search: "occasion=svatba",
    },
  );
});

test("canonical category path does not redirect", () => {
  assert.equal(
    resolveSeoRedirectTarget(
      "/categorii/plikove-za-pari",
      new URLSearchParams(),
    ),
    null,
  );
});

test("legacy product query on occasion page normalizes to canonical slug", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget(
      "/povodi/svatba",
      params({ product: "plik-za-pari" }),
    ),
    {
      pathname: "/povodi/svatba",
      search: "product=plikove-za-pari",
    },
  );
});

test("legacy product query preserves other safe query params", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget(
      "/povodi/svatba",
      params({ product: "plik-za-pari", utm_source: "newsletter" }),
    ),
    {
      pathname: "/povodi/svatba",
      search: "product=plikove-za-pari&utm_source=newsletter",
    },
  );
});

test("canonical occasion product query does not redirect", () => {
  assert.equal(
    resolveSeoRedirectTarget(
      "/povodi/svatba",
      params({ product: "plikove-za-pari" }),
    ),
    null,
  );
});

test("shop sole legacy product param redirects to canonical category page", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/shop", params({ product: "plik-za-pari" })),
    { pathname: "/categorii/plikove-za-pari" },
  );
});

test("products sole legacy product param redirects to canonical category page", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/products", params({ product: "plik-za-pari" })),
    { pathname: "/categorii/plikove-za-pari" },
  );
});

test("faceted shop URL normalizes legacy product slug without dropping params", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget(
      "/shop",
      params({ product: "plik-za-pari", sort: "featured" }),
    ),
    {
      pathname: "/producti",
      search: "product=plikove-za-pari&sort=featured",
    },
  );
});

test("canonical category path normalizes legacy product query param", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget(
      "/categorii/plikove-za-pari",
      params({ product: "plik-za-pari" }),
    ),
    {
      pathname: "/categorii/plikove-za-pari",
      search: "product=plikove-za-pari",
    },
  );
});

test("redirect status constant remains permanent 308", () => {
  assert.equal(SEO_REDIRECT_STATUS, 308);
});

test("legacy slugs are excluded from sitemap candidate paths", () => {
  const sitemapPaths = [
    getCategoryPath("plikove-za-pari"),
    getCategoryPath("family"),
    getCategoryPath("tvorcheski-komplekti"),
  ];

  for (const legacySlug of Object.keys(LEGACY_PRODUCT_CATEGORY_SLUGS)) {
    assert.equal(isLegacyProductCategorySlug(legacySlug), true);
    assert.equal(
      sitemapPaths.includes(`/categorii/${legacySlug}`),
      false,
      `legacy slug ${legacySlug} must not appear in internal category links`,
    );
  }

  assert.equal(sitemapPaths.includes("/categorii/plikove-za-pari"), true);
});

test("normalizeProductCategoryQueryParams is a no-op for canonical values", () => {
  assert.equal(
    normalizeProductCategoryQueryParams(params({ product: "plikove-za-pari" })),
    null,
  );
});
