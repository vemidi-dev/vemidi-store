import assert from "node:assert/strict";
import test from "node:test";

import {
  formatProductPublishValidationMessage,
  requiresProductPublishValidation,
  validateProductPublishReady,
} from "@/lib/admin/product-publish-validation";

const completeInput = {
  name: "Тестов продукт",
  slug: "testov-produkt",
  price: 12.5,
  categoryIds: ["cat-1"],
  primaryCategoryId: "cat-1",
  imageCount: 1,
  subtitle: "Кратко резюме",
};

test("validateProductPublishReady accepts complete product data", () => {
  assert.deepEqual(validateProductPublishReady(completeInput), []);
});

test("validateProductPublishReady reports missing critical fields", () => {
  const issues = validateProductPublishReady({
    name: "",
    slug: "",
    price: null,
    categoryIds: [],
    primaryCategoryId: null,
    imageCount: 0,
    subtitle: null,
  });

  assert.ok(issues.some((issue) => issue.field === "name"));
  assert.ok(issues.some((issue) => issue.field === "slug"));
  assert.ok(issues.some((issue) => issue.field === "price"));
  assert.ok(issues.some((issue) => issue.field === "category"));
  assert.ok(issues.some((issue) => issue.field === "primaryCategory"));
  assert.ok(issues.some((issue) => issue.field === "images"));
  assert.ok(issues.some((issue) => issue.field === "subtitle"));
});

test("validateProductPublishReady rejects invalid slug", () => {
  const issues = validateProductPublishReady({
    ...completeInput,
    slug: "Invalid Slug!",
  });

  assert.deepEqual(
    issues.map((issue) => issue.field),
    ["slug"],
  );
});

test("formatProductPublishValidationMessage returns readable admin copy", () => {
  const message = formatProductPublishValidationMessage([
    { field: "name", message: "Добавете име на продукта." },
    { field: "images", message: "Качете поне една снимка." },
  ]);

  assert.match(message, /не може да бъде публикуван/i);
  assert.match(message, /име/i);
  assert.match(message, /снимка/i);
});

test("save draft does not require publish validation", () => {
  assert.equal(requiresProductPublishValidation("draft"), false);
  assert.equal(requiresProductPublishValidation("archived"), false);
  assert.equal(requiresProductPublishValidation("published"), true);
});
