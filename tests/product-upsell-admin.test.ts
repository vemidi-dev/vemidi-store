import assert from "node:assert/strict";
import test from "node:test";

import { adminFormFields } from "@/lib/admin/form-fields";
import {
  parseProductUpsellOffersFromFormData,
  parseProductUpsellSettingsFromFormData,
} from "@/lib/admin/product-upsell-admin";

test("parseProductUpsellSettingsFromFormData keeps section title", () => {
  const formData = new FormData();
  formData.append(
    adminFormFields.product.upsellSectionTitle,
    "  Допълнете бебешкия комплект  ",
  );

  assert.deepEqual(parseProductUpsellSettingsFromFormData(formData), {
    sectionTitle: "Допълнете бебешкия комплект",
  });
});

test("parseProductUpsellOffersFromFormData keeps selected offers with quantity limits", () => {
  const formData = new FormData();

  formData.append(adminFormFields.product.upsellTargetIds, "target-1");
  formData.append(adminFormFields.product.upsellTargetIds, "target-2");
  formData.append(adminFormFields.product.upsellEnabledIds, "target-2");
  formData.append(adminFormFields.product.upsellTitles, "Папийонка с име");
  formData.append(adminFormFields.product.upsellTitles, "Ключодържател");
  formData.append(adminFormFields.product.upsellDescriptions, "");
  formData.append(
    adminFormFields.product.upsellDescriptions,
    "Специална цена към комплекта.",
  );
  formData.append(adminFormFields.product.upsellSpecialPrices, "5");
  formData.append(adminFormFields.product.upsellSpecialPrices, "7.50");
  formData.append(adminFormFields.product.upsellSuggestedQuantities, "1");
  formData.append(adminFormFields.product.upsellSuggestedQuantities, "5");
  formData.append(adminFormFields.product.upsellMaxQuantities, "1");
  formData.append(adminFormFields.product.upsellMaxQuantities, "2");

  const result = parseProductUpsellOffersFromFormData(formData);

  assert.equal(result.error, null);
  assert.deepEqual(result.offers, [
    {
      upsellProductId: "target-2",
      offerTitle: "Ключодържател",
      offerDescription: "Специална цена към комплекта.",
      specialPrice: 7.5,
      suggestedQuantity: 2,
      maxQuantity: 2,
      sortOrder: 1,
    },
  ]);
});

test("parseProductUpsellOffersFromFormData rejects selected offer without valid price", () => {
  const formData = new FormData();
  formData.append(adminFormFields.product.upsellTargetIds, "target-1");
  formData.append(adminFormFields.product.upsellEnabledIds, "target-1");
  formData.append(adminFormFields.product.upsellTitles, "");
  formData.append(adminFormFields.product.upsellDescriptions, "");
  formData.append(adminFormFields.product.upsellSpecialPrices, "");
  formData.append(adminFormFields.product.upsellSuggestedQuantities, "1");
  formData.append(adminFormFields.product.upsellMaxQuantities, "1");

  const result = parseProductUpsellOffersFromFormData(formData);

  assert.equal(result.offers.length, 0);
  assert.match(result.error ?? "", /специална цена/);
});
