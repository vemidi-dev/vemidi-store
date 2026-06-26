import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { adminFormFields } from "@/lib/admin/form-fields";
import {
  getProductPageContentFormDefaults,
  parseProductPageContentFromFormData,
} from "@/lib/admin/product-page-content";
import { buildProductMutationRpcPayload } from "@/lib/admin/product-rpc";
import { toProduct, type ProductRow } from "@/lib/storefront/mappers";
import {
  getProductPageContentSections,
  hasProductPageContent,
} from "@/lib/product-page-content-sections";

function makeFormData(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

const baseProductRow: ProductRow = {
  id: "prod-1",
  slug: "test-product",
  product_code: "VM-000001",
  name: "Тестов продукт",
  subtitle: "Кратко резюме",
  description: "Описание за продукта",
  additional_info: "Допълнителни детайли",
  fulfillment_note: null,
  personalization_info: "Може да добавите име.",
  dimensions_materials: "Дърво, 10×15 см",
  ordering_info: "Изберете цвят и добавете в количката.",
  price: 12.5,
  image_url: null,
  is_customizable: false,
  is_sold_out: false,
};

test("toProduct maps new page content fields from product rows", () => {
  const product = toProduct(baseProductRow);

  assert.equal(product.personalizationInfo, "Може да добавите име.");
  assert.equal(product.dimensionsMaterials, "Дърво, 10×15 см");
  assert.equal(product.orderingInfo, "Изберете цвят и добавете в количката.");
});

test("getProductPageContentSections keeps storefront order and skips empty fields", () => {
  const sections = getProductPageContentSections({
    description: " Описание ",
    personalizationInfo: "",
    dimensionsMaterials: "Размери",
    orderingInfo: null,
    additionalInfo: "Допълнително",
  });

  assert.deepEqual(
    sections.map((section) => section.heading),
    ["За продукта", "Размери и материали", "Допълнителна информация"],
  );
  assert.equal(hasProductPageContent({ description: "   " }), false);
});

test("parseProductPageContentFromFormData trims and nulls empty values", () => {
  const { payload, error } = parseProductPageContentFromFormData(
    makeFormData({
      [adminFormFields.product.personalizationInfo]: "  Име и дата  ",
      [adminFormFields.product.dimensionsMaterials]: "   ",
      [adminFormFields.product.orderingInfo]: "Стъпка 1",
    }),
  );

  assert.equal(error, null);
  assert.equal(payload.personalizationInfo, "Име и дата");
  assert.equal(payload.dimensionsMaterials, null);
  assert.equal(payload.orderingInfo, "Стъпка 1");
});

test("getProductPageContentFormDefaults maps null product fields to empty strings", () => {
  assert.deepEqual(getProductPageContentFormDefaults(), {
    personalization_info: "",
    dimensions_materials: "",
    ordering_info: "",
  });
});

test("buildProductMutationRpcPayload includes new page content RPC params", () => {
  const payload = buildProductMutationRpcPayload({
    name: "Тест",
    slug: "test",
    subtitle: null,
    description: "Описание",
    additionalInfo: null,
    personalizationInfo: "Персонализация",
    dimensionsMaterials: "Размери",
    orderingInfo: "Поръчка",
    fulfillmentNote: null,
    price: 10,
    imageUrl: null,
    isCustomizable: false,
    isSoldOut: false,
    fulfillmentType: "made_to_order",
    stockQuantity: null,
    cardBadge: null,
    categoryIds: ["cat-1"],
    primaryCategoryId: "cat-1",
    colorFields: [],
    personalizationFields: [],
    wishTemplateIds: [],
    optionGroups: [],
    metaTitle: null,
    metaDescription: null,
    ogTitle: null,
    ogDescription: null,
  });

  assert.equal(payload.p_personalization_info, "Персонализация");
  assert.equal(payload.p_dimensions_materials, "Размери");
  assert.equal(payload.p_ordering_info, "Поръчка");
});

test("product page renders subtitle below price and before add-to-cart options", () => {
  const source = readFileSync(
    new URL("../app/products/[slug]/page.tsx", import.meta.url),
    "utf8",
  );

  const priceIndex = source.indexOf("<ProductPrice product={product}");
  const subtitleIndex = source.indexOf("{product.subtitle ?");
  const addToCartIndex = source.indexOf("<ProductDetailAddToCart");

  assert.ok(priceIndex > -1);
  assert.ok(subtitleIndex > priceIndex);
  assert.ok(addToCartIndex > subtitleIndex);

  const titleBlock = source.slice(
    source.indexOf("<h1"),
    source.indexOf("</h1>") + "</h1>".length,
  );
  assert.doesNotMatch(titleBlock, /\{product\.subtitle \?/);
});

test("admin product content field labels short summary for storefront placement", () => {
  const source = readFileSync(
    new URL("../components/admin/product-page-content-fields.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Кратко резюме/);
  assert.doesNotMatch(source, /подзаглавие/i);
  assert.match(source, /под цената и преди опциите/);
});
