import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getProductFaqGroupIds,
  getProductFaqItemIds,
  normalizeFaqSlug,
  parseFaqGroupForm,
  parseFaqItemForm,
  validateProductFaqGroupSelection,
  validateProductFaqItemSelection,
} from "@/lib/admin/faq-form";
import { adminFormFields } from "@/lib/admin/form-fields";

function makeForm(entries: Record<string, string | string[]>) {
  const formData = new FormData();
  Object.entries(entries).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, item));
    } else {
      formData.set(key, value);
    }
  });
  return formData;
}

describe("faq admin form validation", () => {
  test("normalizeFaqSlug transliterates and slugifies group names", () => {
    assert.equal(normalizeFaqSlug("", "Доставка и поръчка"), "dostavka-i-porachka");
    assert.equal(normalizeFaqSlug("Custom Slug"), "custom-slug");
  });

  test("parseFaqGroupForm rejects empty name", () => {
    const result = parseFaqGroupForm(
      makeForm({
        [adminFormFields.faq.groupName]: "",
        [adminFormFields.faq.groupSlug]: "test",
        [adminFormFields.faq.groupScope]: "product",
      }),
    );
    assert.ok(result.error?.includes("име"));
  });

  test("parseFaqItemForm rejects empty question and answer", () => {
    const missingQuestion = parseFaqItemForm(
      makeForm({
        [adminFormFields.faq.itemQuestion]: "",
        [adminFormFields.faq.itemAnswer]: "Отговор",
      }),
    );
    assert.ok(missingQuestion.error?.includes("Въпросът"));

    const missingAnswer = parseFaqItemForm(
      makeForm({
        [adminFormFields.faq.itemQuestion]: "Въпрос",
        [adminFormFields.faq.itemAnswer]: "   ",
      }),
    );
    assert.ok(missingAnswer.error?.includes("Отговорът"));
  });

  test("parseFaqGroupForm accepts valid product group", () => {
    const result = parseFaqGroupForm(
      makeForm({
        [adminFormFields.faq.groupName]: "Продуктова група",
        [adminFormFields.faq.groupSlug]: "produktova-grupa",
        [adminFormFields.faq.groupScope]: "product",
      }),
    );
    assert.equal(result.error, null);
    assert.equal(result.scope, "product");
    assert.equal(result.slug, "produktova-grupa");
  });
});

describe("product FAQ association parsing", () => {
  test("getProductFaqGroupIds deduplicates selected groups", () => {
    const ids = getProductFaqGroupIds(
      makeForm({
        [adminFormFields.product.faqGroupIds]: ["g1", "g1", "g2"],
      }),
    );
    assert.deepEqual(ids, ["g1", "g2"]);
  });

  test("getProductFaqItemIds deduplicates selected items", () => {
    const ids = getProductFaqItemIds(
      makeForm({
        [adminFormFields.product.faqItemIds]: ["i1", "i2", "i2"],
      }),
    );
    assert.deepEqual(ids, ["i1", "i2"]);
  });

  test("validateProductFaqGroupSelection rejects global or unknown groups", () => {
    const eligible = new Set(["product-group-1"]);
    assert.equal(
      validateProductFaqGroupSelection(["product-group-1"], eligible),
      null,
    );
    assert.match(
      validateProductFaqGroupSelection(["global-group"], eligible) ?? "",
      /глобална/i,
    );
  });

  test("validateProductFaqItemSelection rejects unknown items", () => {
    const known = new Set(["item-1"]);
    assert.equal(validateProductFaqItemSelection(["item-1"], known), null);
    assert.match(
      validateProductFaqItemSelection(["missing"], known) ?? "",
      /невалиден/i,
    );
  });
});
