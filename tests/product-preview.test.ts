import assert from "node:assert/strict";
import test from "node:test";

import {
  getAdminProductPreviewPath,
  isAdminProductPreviewPath,
} from "@/lib/admin/product-preview-path";
import { isProductStorefrontPublished } from "@/lib/product-publication";

test("getAdminProductPreviewPath builds admin-only preview route", () => {
  const productId = "11111111-1111-4111-8111-111111111111";
  assert.equal(
    getAdminProductPreviewPath(productId),
    "/admin/products/11111111-1111-4111-8111-111111111111/preview",
  );
});

test("isAdminProductPreviewPath matches preview route only", () => {
  assert.equal(
    isAdminProductPreviewPath("/admin/products/abc/preview"),
    true,
  );
  assert.equal(
    isAdminProductPreviewPath("/admin/products/abc/preview/"),
    true,
  );
  assert.equal(isAdminProductPreviewPath("/produkti/test-slug"), false);
  assert.equal(isAdminProductPreviewPath("/admin?tab=products"), false);
});

test("draft products remain hidden from public storefront routes", () => {
  assert.equal(isProductStorefrontPublished("draft"), false);
  assert.equal(isProductStorefrontPublished("archived"), false);
  assert.equal(isProductStorefrontPublished("published"), true);
});

test("admin preview route is separate from public product URL", () => {
  const productId = "product-uuid";
  const previewPath = getAdminProductPreviewPath(productId);

  assert.match(previewPath, /^\/admin\/products\//);
  assert.doesNotMatch(previewPath, /^\/produkti\//);
});
