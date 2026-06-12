import assert from "node:assert/strict";
import test from "node:test";

import { adminFormFields } from "@/lib/admin/form-fields";
import {
  getAdminTab,
  getCategoryIds,
  getWishTemplateIds,
  makeCreateProductDraft,
} from "@/lib/admin/form-data";
import { parseProductOptionGroups } from "@/lib/admin/parse-option-groups";

test("admin form field names stay aligned with product draft parsing", () => {
  const formData = new FormData();
  formData.set(adminFormFields.product.name, "Подаръчна кутия");
  formData.set(adminFormFields.product.slug, "podarachna-kutiya");
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
    slug: "podarachna-kutiya",
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
        price_delta: "0",
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
    "content",
  ] as const) {
    formData.set(adminFormFields.common.tab, tab);
    assert.equal(getAdminTab(formData, "products"), tab);
  }

  formData.set(adminFormFields.common.tab, "unknown");
  assert.equal(getAdminTab(formData, "orders"), "orders");
});

test("mixed product option groups keep their row values aligned", () => {
  const formData = new FormData();
  const appendRow = (values: {
    name: string;
    key: string;
    inputType: string;
    required: string;
    min: string;
    max: string;
    placeholder: string;
    maxLength: string;
    textPriceDelta: string;
    valuesJson: string;
  }) => {
    formData.append(adminFormFields.optionGroup.ids, "");
    formData.append(adminFormFields.optionGroup.names, values.name);
    formData.append(adminFormFields.optionGroup.keys, values.key);
    formData.append(adminFormFields.optionGroup.inputTypes, values.inputType);
    formData.append(adminFormFields.optionGroup.required, values.required);
    formData.append(adminFormFields.optionGroup.minSelects, values.min);
    formData.append(adminFormFields.optionGroup.maxSelects, values.max);
    formData.append(adminFormFields.optionGroup.sortOrders, "0");
    formData.append(adminFormFields.optionGroup.active, "on");
    formData.append(adminFormFields.optionGroup.dependsOnOptionIds, "");
    formData.append(adminFormFields.optionGroup.placeholders, values.placeholder);
    formData.append(adminFormFields.optionGroup.maxLengths, values.maxLength);
    formData.append(adminFormFields.optionGroup.textPriceDeltas, values.textPriceDelta);
    formData.append(adminFormFields.optionGroup.valuesJson, values.valuesJson);
  };

  appendRow({
    name: "Размер",
    key: "size",
    inputType: "single",
    required: "on",
    min: "1",
    max: "1",
    placeholder: "",
    maxLength: "",
    textPriceDelta: "0",
    valuesJson: JSON.stringify([
      {
        label: "Мини",
        key: "mini",
        priceDelta: 0,
        isDefault: true,
        isActive: true,
        isSoldOut: false,
      },
    ]),
  });
  appendRow({
    name: "Име",
    key: "name",
    inputType: "text",
    required: "off",
    min: "0",
    max: "0",
    placeholder: "Въведете име",
    maxLength: "50",
    textPriceDelta: "3",
    valuesJson: "[]",
  });

  const parsed = parseProductOptionGroups(formData);
  assert.equal(parsed.error, null);
  assert.equal(parsed.groups[0]?.name, "Размер");
  assert.equal(parsed.groups[0]?.values[0]?.label, "Мини");
  assert.equal(parsed.groups[1]?.name, "Име");
  assert.equal(parsed.groups[1]?.placeholder, "Въведете име");
  assert.equal(parsed.groups[1]?.maxLength, 50);
  assert.equal(parsed.groups[1]?.textPriceDelta, 3);
});
