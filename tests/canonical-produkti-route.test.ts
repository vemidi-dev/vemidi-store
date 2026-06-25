import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import { PRODUCT_INDEX_PATH } from "@/lib/product-url";
import {
  resolveProductsPageRedirect,
  buildShopMetadata,
} from "@/lib/seo/shop-route";
import {
  resolveSeoRedirectTarget,
  SEO_REDIRECT_STATUS,
} from "@/lib/seo/middleware-redirects";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function params(input: Record<string, string>): URLSearchParams {
  return new URLSearchParams(input);
}

const categories = [
  {
    id: "cat-1",
    name: "Пликове",
    slug: "plikove-za-pari",
    category_type: "product" as const,
    parent_id: null,
    show_on_home: true,
    home_sort_order: 1,
    card_description: null,
    createdAt: null,
  },
];

describe("canonical /produkti catalog route", () => {
  test("/produkti page re-exports the shop catalog page", () => {
    const produktiPage = readSource("../app/produkti/page.tsx");
    assert.match(produktiPage, /export \{ default, generateMetadata \} from "@\/app\/shop\/page"/);
  });

  test("bare /products redirects to /produkti", () => {
    assert.deepEqual(resolveSeoRedirectTarget("/products", new URLSearchParams()), {
      pathname: PRODUCT_INDEX_PATH,
    });
  });

  test("legacy /shop redirects to /produkti", () => {
    assert.deepEqual(resolveSeoRedirectTarget("/shop", new URLSearchParams()), {
      pathname: PRODUCT_INDEX_PATH,
    });
  });

  test("/producti has no route and is not redirected by middleware", () => {
    assert.throws(() => readSource("../app/producti/page.tsx"));
    assert.equal(
      resolveSeoRedirectTarget("/producti", params({ povod: "svatba", sort: "featured" })),
      null,
    );
    assert.equal(resolveSeoRedirectTarget("/producti", new URLSearchParams()), null);
  });

  test("/products/[slug] redirects to /produkti/[slug]", () => {
    assert.deepEqual(
      resolveSeoRedirectTarget("/products/testov-produkt", new URLSearchParams()),
      { pathname: "/produkti/testov-produkt" },
    );
  });

  test("/produkti sole canonical filter params stay on catalog without path redirect", () => {
    assert.equal(
      resolveSeoRedirectTarget(PRODUCT_INDEX_PATH, params({ povod: "krashtene" })),
      null,
    );
    assert.equal(
      resolveSeoRedirectTarget(PRODUCT_INDEX_PATH, params({ vid: "plikove-za-pari" })),
      null,
    );
  });

  test("products page bare redirect target uses /produkti", () => {
    assert.equal(resolveProductsPageRedirect({}, categories), PRODUCT_INDEX_PATH);
  });

  test("shop metadata canonical and OG use /produkti", async () => {
    const metadata = buildShopMetadata({}, categories);
    assert.equal(metadata.alternates?.canonical, PRODUCT_INDEX_PATH);
    assert.equal(metadata.openGraph?.url, PRODUCT_INDEX_PATH);
  });

  test("faceted shop metadata stays noindex with canonical /produkti", () => {
    const metadata = buildShopMetadata({ q: "плик" }, categories);
    assert.deepEqual(metadata.robots, { index: false, follow: true });
    assert.equal(metadata.alternates?.canonical, PRODUCT_INDEX_PATH);
  });

  test("sitemap includes /produkti and not /producti", () => {
    const sitemap = readSource("../app/sitemap.ts");
    assert.match(sitemap, /path: "\/produkti"/);
    assert.doesNotMatch(sitemap, /path: "\/producti"/);
  });

  test("no remaining public href=\"/producti\" in storefront source", () => {
    const publicFiles = [
      "../app/page.tsx",
      "../app/shop/page.tsx",
      "../app/products/[slug]/page.tsx",
      "../app/categories/page.tsx",
      "../app/blog/page.tsx",
      "../app/about/page.tsx",
      "../app/login/page.tsx",
      "../app/account/page.tsx",
      "../app/not-found.tsx",
      "../app/error.tsx",
      "../components/layout/header-actions.tsx",
      "../components/home/home-hero.tsx",
      "../components/cart/cart-panel.tsx",
      "../components/checkout/checkout-panel.tsx",
      "../components/thank-you/thank-you-content.tsx",
      "../components/campaign/campaign-checkout-error.tsx",
      "../config/site.ts",
      "../lib/seo/breadcrumbs.ts",
    ];

    for (const file of publicFiles) {
      const source = readSource(file);
      assert.doesNotMatch(
        source,
        /href="\/producti"/,
        `${file} should not contain href="/producti"`,
      );
    }
  });

  test("SEO redirect status remains permanent 308", () => {
    assert.equal(SEO_REDIRECT_STATUS, 308);
  });

  test("middleware matcher does not include /producti", () => {
    const middleware = readSource("../middleware.ts");
    assert.doesNotMatch(middleware, /"\/producti"/);
  });
});
