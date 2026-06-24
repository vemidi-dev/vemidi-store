import assert from "node:assert/strict";
import test from "node:test";

import {
  getProductContentFormDefaults,
  parseProductContentFromFormData,
  productContentLimits,
} from "@/lib/admin/product-content";
import { adminFormFields } from "@/lib/admin/form-fields";

function makeFormData(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

test("parseProductContentFromFormData trims and nulls empty SEO fields", () => {
  const { payload, error } = parseProductContentFromFormData(
    makeFormData({
      [adminFormFields.product.metaTitle]: "  SEO title  ",
      [adminFormFields.product.metaDescription]: "   ",
      [adminFormFields.product.ogTitle]: "OG title",
      [adminFormFields.product.ogDescription]: "OG description",
    }),
  );

  assert.equal(error, null);
  assert.equal(payload.meta_title, "SEO title");
  assert.equal(payload.meta_description, null);
  assert.equal(payload.og_title, "OG title");
  assert.equal(payload.og_description, "OG description");
});

test("parseProductContentFromFormData rejects over-limit meta title", () => {
  const { error } = parseProductContentFromFormData(
    makeFormData({
      [adminFormFields.product.metaTitle]: "x".repeat(
        productContentLimits.meta_title + 1,
      ),
    }),
  );

  assert.match(error ?? "", /SEO заглавие/);
});

test("getProductContentFormDefaults maps null product SEO fields to empty strings", () => {
  assert.deepEqual(getProductContentFormDefaults(), {
    meta_title: "",
    meta_description: "",
    og_title: "",
    og_description: "",
  });
});
