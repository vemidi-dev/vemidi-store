import assert from "node:assert/strict";
import test from "node:test";

import {
  isSeoRedirectSafeMethod,
  isValidRedirectSlug,
  resolveSeoRedirectTarget,
} from "@/lib/seo/middleware-redirects";

function params(input: Record<string, string>): URLSearchParams {
  return new URLSearchParams(input);
}

test("bare /products redirects to /producti", () => {
  assert.deepEqual(resolveSeoRedirectTarget("/products", new URLSearchParams()), {
    pathname: "/producti",
  });
});

test("legacy /shop redirects to /producti", () => {
  assert.deepEqual(resolveSeoRedirectTarget("/shop", new URLSearchParams()), {
    pathname: "/producti",
  });
});

test("legacy product detail path redirects to Bulgarian product path", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/products/testov-produkt", new URLSearchParams()),
    { pathname: "/produkti/testov-produkt" },
  );
});

test("legacy category and occasion hubs redirect to Bulgarian paths", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/categories", new URLSearchParams()),
    { pathname: "/categorii" },
  );
  assert.deepEqual(
    resolveSeoRedirectTarget("/occasions", new URLSearchParams()),
    { pathname: "/povodi" },
  );
});

test("legacy static pages redirect to Bulgarian paths", () => {
  assert.deepEqual(resolveSeoRedirectTarget("/about", new URLSearchParams()), {
    pathname: "/za-nas",
  });
  assert.deepEqual(resolveSeoRedirectTarget("/contact", new URLSearchParams()), {
    pathname: "/kontakti",
  });
  assert.deepEqual(resolveSeoRedirectTarget("/events", new URLSearchParams()), {
    pathname: "/sabitiya",
  });
  assert.deepEqual(
    resolveSeoRedirectTarget("/events/rabotilnica", new URLSearchParams()),
    { pathname: "/sabitiya/rabotilnica" },
  );
});

test("/products with sole product category param redirects to category page", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/products", params({ product: "kutii" })),
    { pathname: "/categorii/kutii" },
  );
});

test("/products with sole occasion param redirects to occasion page", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/products", params({ occasion: "svatba" })),
    { pathname: "/povodi/svatba" },
  );
});

test("/products with legacy category param stays on RSC route", () => {
  assert.equal(
    resolveSeoRedirectTarget("/products", params({ category: "kutii" })),
    null,
  );
});

test("/shop sole product param redirects to category page", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/shop", params({ product: "kutii" })),
    { pathname: "/categorii/kutii" },
  );
});

test("/shop sole legacy product param redirects to canonical category page", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/shop", params({ product: "plik-za-pari" })),
    { pathname: "/categorii/plikove-za-pari" },
  );
});

test("/shop sole occasion param redirects to occasion page", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/shop", params({ occasion: "svatba" })),
    { pathname: "/povodi/svatba" },
  );
});

test("/shop legacy category param stays on RSC route", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/shop", params({ category: "kutii" })),
    { pathname: "/producti", search: "category=kutii" },
  );
});

test("faceted shop URL redirects to the Bulgarian catalog path", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/shop", params({ product: "kutii", sort: "featured" })),
    { pathname: "/producti", search: "product=kutii&sort=featured" },
  );
  assert.deepEqual(
    resolveSeoRedirectTarget("/shop", params({ q: "test" })),
    { pathname: "/producti", search: "q=test" },
  );
});

test("isValidRedirectSlug accepts normalized lowercase hyphenated slugs", () => {
  assert.equal(isValidRedirectSlug("kutii"), true);
  assert.equal(isValidRedirectSlug("plik-za-pari"), true);
  assert.equal(isValidRedirectSlug("tvorcheski-komplekti"), true);
});

test("isValidRedirectSlug rejects empty, spaced, encoded-space and invalid slugs", () => {
  assert.equal(isValidRedirectSlug(""), false);
  assert.equal(isValidRedirectSlug(" "), false);
  assert.equal(isValidRedirectSlug("kutii "), false);
  assert.equal(isValidRedirectSlug(" kutii"), false);
  assert.equal(isValidRedirectSlug("sakndinavski muh"), false);
  assert.equal(isValidRedirectSlug("foo/bar"), false);
  assert.equal(isValidRedirectSlug("Kutii"), false);
  assert.equal(isValidRedirectSlug("kutii!"), false);
  assert.equal(isValidRedirectSlug("--kutii"), false);
  assert.equal(isValidRedirectSlug("kutii--"), false);
});

test("invalid slug query values are not redirected", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/shop", params({ product: "sakndinavski muh" })),
    { pathname: "/producti", search: "product=sakndinavski+muh" },
  );
  assert.deepEqual(
    resolveSeoRedirectTarget("/shop", params({ product: "foo/bar" })),
    { pathname: "/producti", search: "product=foo%2Fbar" },
  );
  assert.deepEqual(
    resolveSeoRedirectTarget("/shop", params({ occasion: "Svatba" })),
    { pathname: "/producti", search: "occasion=Svatba" },
  );
  assert.deepEqual(
    resolveSeoRedirectTarget("/shop", params({ product: "" })),
    { pathname: "/producti", search: "product=" },
  );
  assert.deepEqual(
    resolveSeoRedirectTarget(
      "/shop",
      new URLSearchParams("product=sakndinavski%20muh"),
    ),
    { pathname: "/producti", search: "product=sakndinavski+muh" },
  );
});

test("isSeoRedirectSafeMethod allows GET and HEAD only", () => {
  assert.equal(isSeoRedirectSafeMethod("GET"), true);
  assert.equal(isSeoRedirectSafeMethod("HEAD"), true);
  assert.equal(isSeoRedirectSafeMethod("POST"), false);
  assert.equal(isSeoRedirectSafeMethod("PUT"), false);
  assert.equal(isSeoRedirectSafeMethod("PATCH"), false);
  assert.equal(isSeoRedirectSafeMethod("DELETE"), false);
});
