import assert from "node:assert/strict";
import test from "node:test";

import { adminFormFields } from "@/lib/admin/form-fields";
import {
  clearProductCreateLocalDraft,
  mergeProductCreateDrafts,
  parseProductCreateLocalDraft,
  PRODUCT_CREATE_LOCAL_DRAFT_KEY,
  readProductCreateLocalDraft,
  serializeProductCreateLocalDraft,
  shouldClearProductCreateLocalDraftOnSuccess,
  validateProductCreateColorFieldsClient,
  writeProductCreateLocalDraft,
} from "@/lib/admin/product-create-local-draft";

function makeFilledFormData() {
  const formData = new FormData();
  formData.set(adminFormFields.product.name, "Тестов продукт");
  formData.set(adminFormFields.product.slug, "testov-produkt");
  formData.set(adminFormFields.product.price, "19.90");
  formData.set(adminFormFields.product.description, "Описание");
  formData.set(adminFormFields.product.metaTitle, "SEO заглавие");
  formData.set(adminFormFields.product.metaDescription, "SEO описание");
  formData.append(adminFormFields.product.categoryIds, "cat-1");
  formData.set(adminFormFields.product.primaryCategoryId, "cat-1");
  formData.append(adminFormFields.product.faqGroupIds, "faq-group-1");
  formData.append(adminFormFields.colorField.labels, "Цвят");
  formData.append(adminFormFields.colorField.groupIds, "group-1");
  formData.append(adminFormFields.colorField.minSelects, "1");
  formData.append(adminFormFields.colorField.maxSelects, "1");
  formData.append(adminFormFields.colorField.optionIds, "opt-1,opt-2");
  formData.append(adminFormFields.colorField.selectionModes, "choice");
  formData.append(adminFormFields.colorField.requiredTotalQuantities, "");
  return formData;
}

test("serialize/parse product create local draft keeps SEO FAQ and colors", () => {
  const raw = serializeProductCreateLocalDraft(makeFilledFormData());
  const draft = parseProductCreateLocalDraft(raw);
  assert.ok(draft);
  assert.equal(draft.name, "Тестов продукт");
  assert.equal(draft.metaTitle, "SEO заглавие");
  assert.equal(draft.metaDescription, "SEO описание");
  assert.deepEqual(draft.faqGroupIds, ["faq-group-1"]);
  assert.equal(draft.colorFields.length, 1);
  assert.deepEqual(draft.colorFields[0]?.optionIds, ["opt-1", "opt-2"]);
  assert.equal(draft.colorFields[0]?.selectionMode, "choice");
  assert.ok(draft.savedAt);
});

test("local draft storage helpers read write and clear", () => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  };

  assert.equal(writeProductCreateLocalDraft(makeFilledFormData(), storage), true);
  assert.ok(memory.get(PRODUCT_CREATE_LOCAL_DRAFT_KEY));
  const loaded = readProductCreateLocalDraft(storage);
  assert.equal(loaded?.name, "Тестов продукт");
  clearProductCreateLocalDraft(storage);
  assert.equal(readProductCreateLocalDraft(storage), null);
});

test("client color validation blocks empty option lists", () => {
  const formData = new FormData();
  formData.append(adminFormFields.colorField.labels, "Цвят");
  formData.append(adminFormFields.colorField.groupIds, "group-1");
  formData.append(adminFormFields.colorField.minSelects, "1");
  formData.append(adminFormFields.colorField.maxSelects, "1");
  formData.append(adminFormFields.colorField.optionIds, "");
  formData.append(adminFormFields.colorField.selectionModes, "choice");

  assert.equal(
    validateProductCreateColorFieldsClient(formData),
    "Изберете поне един разрешен цвят за всяко цветово поле.",
  );

  formData.set(adminFormFields.colorField.optionIds, "opt-1");
  // getAll still has empty first entry from append — rebuild clean
  const ok = new FormData();
  ok.append(adminFormFields.colorField.labels, "Цвят");
  ok.append(adminFormFields.colorField.groupIds, "group-1");
  ok.append(adminFormFields.colorField.minSelects, "1");
  ok.append(adminFormFields.colorField.maxSelects, "1");
  ok.append(adminFormFields.colorField.optionIds, "opt-1");
  ok.append(adminFormFields.colorField.selectionModes, "choice");
  assert.equal(validateProductCreateColorFieldsClient(ok), null);
});

test("success message clears local create draft", () => {
  assert.equal(
    shouldClearProductCreateLocalDraftOnSuccess("Продуктът е добавен като чернова."),
    true,
  );
  assert.equal(
    shouldClearProductCreateLocalDraftOnSuccess("Продуктът е добавен и публикуван."),
    true,
  );
  assert.equal(shouldClearProductCreateLocalDraftOnSuccess("Категорията е добавена."), false);
});

test("missing color name does not discard long multiline product copy in the local draft", () => {
  const form = makeFilledFormData();
  const copy = "Подробно описание на продукта\nВтори ред с важна информация.\n".repeat(600);
  form.set(adminFormFields.product.description, copy);
  form.set(adminFormFields.product.orderingInfo, "Първа стъпка\nВтора стъпка");
  form.set(adminFormFields.colorField.labels, "");
  assert.equal(validateProductCreateColorFieldsClient(form), "Всеки избор на цвят трябва да има име и палитра.");
  const draft = parseProductCreateLocalDraft(serializeProductCreateLocalDraft(form));
  assert.equal(draft?.description, copy.trim());
  assert.equal(draft?.orderingInfo, "Първа стъпка\nВтора стъпка");
  assert.equal(draft?.colorFields[0]?.label, "");
  assert.deepEqual(draft?.colorFields[0]?.optionIds, ["opt-1", "opt-2"]);
});

test("complete local recovery takes priority over a shorter redirect draft", () => {
  const local = parseProductCreateLocalDraft(serializeProductCreateLocalDraft(makeFilledFormData()));
  assert.ok(local);
  assert.equal(mergeProductCreateDrafts({ ...local, description: "Стар текст" }, local), local);
  assert.equal(mergeProductCreateDrafts(local, null)?.description, local.description);
  assert.equal(mergeProductCreateDrafts(null, null), null);
});

test("an old success URL cannot clear a newer product draft on refresh", () => {
  const savedAt = "2026-10-26T10:00:00Z";
  assert.equal(shouldClearProductCreateLocalDraftOnSuccess("Продуктът е добавен като чернова.", savedAt, String(Date.parse(savedAt) - 1000)), false);
  assert.equal(shouldClearProductCreateLocalDraftOnSuccess("Продуктът е добавен като чернова.", savedAt, String(Date.parse(savedAt) + 1000)), true);
  assert.equal(shouldClearProductCreateLocalDraftOnSuccess("Продуктът е добавен като чернова.", savedAt, null), false);
});
