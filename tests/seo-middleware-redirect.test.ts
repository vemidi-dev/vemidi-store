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

test("bare /products redirects to /shop", () => {
  assert.deepEqual(resolveSeoRedirectTarget("/products", new URLSearchParams()), {
    pathname: "/shop",
  });
});

test("/products with sole product category param redirects to category page", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/products", params({ product: "kutii" })),
    { pathname: "/categories/kutii" },
  );
});

test("/products with sole occasion param redirects to occasion page", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/products", params({ occasion: "svatba" })),
    { pathname: "/occasions/svatba" },
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
    { pathname: "/categories/kutii" },
  );
});

test("/shop sole occasion param redirects to occasion page", () => {
  assert.deepEqual(
    resolveSeoRedirectTarget("/shop", params({ occasion: "svatba" })),
    { pathname: "/occasions/svatba" },
  );
});

test("/shop legacy category param stays on RSC route", () => {
  assert.equal(
    resolveSeoRedirectTarget("/shop", params({ category: "kutii" })),
    null,
  );
});

test("faceted shop URL is not redirected by middleware", () => {
  assert.equal(
    resolveSeoRedirectTarget("/shop", params({ product: "kutii", sort: "featured" })),
    null,
  );
  assert.equal(
    resolveSeoRedirectTarget("/shop", params({ q: "test" })),
    null,
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
  assert.equal(
    resolveSeoRedirectTarget("/shop", params({ product: "sakndinavski muh" })),
    null,
  );
  assert.equal(
    resolveSeoRedirectTarget("/shop", params({ product: "foo/bar" })),
    null,
  );
  assert.equal(
    resolveSeoRedirectTarget("/shop", params({ occasion: "Svatba" })),
    null,
  );
  assert.equal(
    resolveSeoRedirectTarget("/shop", params({ product: "" })),
    null,
  );
  assert.equal(
    resolveSeoRedirectTarget(
      "/shop",
      new URLSearchParams("product=sakndinavski%20muh"),
    ),
    null,
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
