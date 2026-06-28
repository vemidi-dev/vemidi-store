import assert from "node:assert/strict";
import test from "node:test";

import {
  productEditAnchorId,
  productEditDetailsId,
  productGalleryAnchorId,
  resolveProductEditScrollTargetId,
} from "@/lib/admin/product-edit-navigation";

const productId = "abc-123";

test("productEditAnchorId and productGalleryAnchorId use stable ids", () => {
  assert.equal(productEditAnchorId(productId), "product-abc-123");
  assert.equal(productEditDetailsId(productId), "product-edit-abc-123");
  assert.equal(productGalleryAnchorId(productId), "product-abc-123-gallery");
});

test("resolveProductEditScrollTargetId prefers known hash targets", () => {
  assert.equal(
    resolveProductEditScrollTargetId(productId, "#product-abc-123-gallery"),
    "product-abc-123-gallery",
  );
  assert.equal(
    resolveProductEditScrollTargetId(productId, "product-abc-123"),
    "product-abc-123",
  );
});

test("resolveProductEditScrollTargetId falls back to product anchor", () => {
  assert.equal(resolveProductEditScrollTargetId(productId, ""), "product-abc-123");
  assert.equal(
    resolveProductEditScrollTargetId(productId, "#unknown"),
    "product-abc-123",
  );
});
