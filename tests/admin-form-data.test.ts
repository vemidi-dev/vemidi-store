import assert from "node:assert/strict";
import test from "node:test";

import { adminFormFields } from "@/lib/admin/form-fields";
import {
  getAdminTab,
  getCategoryIds,
  getWishTemplateIds,
  makeCreateProductDraft,
} from "@/lib/admin/form-data";

test("admin form field names stay aligned with product draft parsing", () => {
  const formData = new FormData();
  formData.set(adminFormFields.product.name, "Подаръчна кутия");
  formData.set(adminFormFields.product.description, "Описание");
  formData.set(adminFormFields.product.additionalInfo, "Допълнителни детайли");
  formData.set(adminFormFields.product.fulfillmentNote, "Изработка до 5 дни");
  formData.set(adminFormFields.product.price, "29.90");
  formData.set(adminFormFields.product.isCustomizable, "on");
  formData.append(adminFormFields.product.categoryIds, "category-one");
  formData.append(adminFormFields.product.categoryIds, "category-one");
  formData.append(adminFormFields.product.categoryIds, "category-two");
  formData.append(adminFormFields.colorField.labels, "Цвят на панделка");
  formData.append(adminFormFields.colorField.groupIds, "ribbon");
  formData.append(adminFormFields.colorField.minSelects, "1");
  formData.append(adminFormFields.colorField.maxSelects, "1");
  formData.append(adminFormFields.colorField.optionIds, "pink,blue");
  formData.append(
    adminFormFields.personalizationField.labels,
    "Име на детето",
  );
  formData.append(
    adminFormFields.personalizationField.keys,
    "field_name",
  );
  formData.append(
    adminFormFields.personalizationField.types,
    "text",
  );
  formData.append(
    adminFormFields.personalizationField.placeholders,
    "Мария",
  );
  formData.append(
    adminFormFields.personalizationField.maxLengths,
    "50",
  );
  formData.append(adminFormFields.personalizationField.required, "1");
  formData.append(adminFormFields.personalizationField.allowsWishes, "0");
  formData.append(adminFormFields.product.wishTemplateIds, "wish-one");
  formData.append(adminFormFields.product.wishTemplateIds, "wish-one");
  formData.append(adminFormFields.product.wishTemplateIds, "wish-two");

  assert.deepEqual(getCategoryIds(formData), ["category-one", "category-two"]);
  assert.deepEqual(getWishTemplateIds(formData), ["wish-one", "wish-two"]);
  assert.deepEqual(JSON.parse(makeCreateProductDraft(formData)), {
    name: "Подаръчна кутия",
    description: "Описание",
    additional_info: "Допълнителни детайли",
    fulfillment_note: "Изработка до 5 дни",
    price: "29.90",
    is_customizable: true,
    is_sold_out: false,
    card_badge: "",
    category_ids: ["category-one", "category-two"],
    color_fields: [
      {
        label: "Цвят на панделка",
        group_id: "ribbon",
        min_select: "1",
        max_select: "1",
        option_ids: "pink,blue",
      },
    ],
    personalization_fields: [
      {
        label: "Име на детето",
        field_key: "field_name",
        field_type: "text",
        placeholder: "Мария",
        max_length: "50",
        is_required: true,
        allows_wish_templates: false,
      },
    ],
    wish_template_ids: ["wish-one", "wish-two"],
  });
});

test("all current admin tabs are accepted", () => {
  const formData = new FormData();

  for (const tab of [
    "products",
    "categories",
    "colors",
    "promotions",
    "orders",
    "blog",
    "events",
    "wishes",
    "subscribers",
  ] as const) {
    formData.set(adminFormFields.common.tab, tab);
    assert.equal(getAdminTab(formData, "products"), tab);
  }

  formData.set(adminFormFields.common.tab, "unknown");
  assert.equal(getAdminTab(formData, "orders"), "orders");
});
