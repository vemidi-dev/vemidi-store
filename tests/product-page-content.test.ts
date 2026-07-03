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
  heading_subtitle: "H2 подзаглавие",
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
  visibility: "public",
};

test("toProduct maps headingSubtitle from product rows", () => {
  const product = toProduct(baseProductRow);

  assert.equal(product.headingSubtitle, "H2 подзаглавие");
});

test("toProduct maps null headingSubtitle without fallback text", () => {
  const product = toProduct({ ...baseProductRow, heading_subtitle: null });

  assert.equal(product.headingSubtitle, null);
});

test("toProduct maps subtitle from product rows", () => {
  const product = toProduct(baseProductRow);

  assert.equal(product.subtitle, "Кратко резюме");
});

test("toProduct maps null subtitle without fallback text", () => {
  const product = toProduct({ ...baseProductRow, subtitle: null });

  assert.equal(product.subtitle, null);
});

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

test("buildProductMutationRpcPayload includes heading subtitle RPC param", () => {
  const payload = buildProductMutationRpcPayload({
    name: "Тест",
    slug: "test",
    subtitle: "Кратко резюме",
    headingSubtitle: "H2 подзаглавие",
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

  assert.equal(payload.p_heading_subtitle, "H2 подзаглавие");
  assert.equal(payload.p_subtitle, "Кратко резюме");
  assert.equal(payload.p_personalization_info, "Персонализация");
  assert.equal(payload.p_dimensions_materials, "Размери");
  assert.equal(payload.p_ordering_info, "Поръчка");
});

test("product detail view renders headingSubtitle between title and occasion tags", () => {
  const source = readFileSync(
    new URL("../components/product/product-detail-view.tsx", import.meta.url),
    "utf8",
  );

  const titleEnd = source.indexOf("</h1>");
  const headingSubtitleIndex = source.indexOf("{product.headingSubtitle ?");
  const occasionIndex = source.indexOf("<ProductDetailOccasionTags");
  const priceIndex = source.indexOf("<ProductPrice product={product}");
  const summaryIndex = source.indexOf("{product.subtitle ?");

  const titleWrapperStart = source.indexOf("<h1");
  const titleWrapperEnd = source.indexOf(
    "<ProductDetailOccasionTags",
    titleWrapperStart,
  );
  const titleWrapper = source.slice(titleWrapperStart, titleWrapperEnd);

  assert.ok(titleEnd > -1);
  assert.ok(headingSubtitleIndex > titleEnd);
  assert.ok(occasionIndex > headingSubtitleIndex);
  assert.ok(priceIndex > occasionIndex);
  assert.ok(summaryIndex > priceIndex);
  assert.match(titleWrapper, /\{product\.headingSubtitle \?/);
  assert.doesNotMatch(titleWrapper, /\{product\.subtitle \?/);
  assert.match(source.slice(headingSubtitleIndex, headingSubtitleIndex + 200), /<h2\b/);
});

test("admin product content fields keep heading subtitle and short summary separate", () => {
  const source = readFileSync(
    new URL("../components/admin/product-page-content-fields.tsx", import.meta.url),
    "utf8",
  );

  const headingFieldIndex = source.indexOf("Подзаглавие");
  const summaryFieldIndex = source.indexOf("Кратко резюме");

  assert.ok(headingFieldIndex > -1);
  assert.ok(summaryFieldIndex > headingFieldIndex);
  assert.match(source, /name=\{adminFormFields\.product\.headingSubtitle\}/);
  assert.match(source, /name=\{adminFormFields\.product\.subtitle\}/);
  assert.match(source, /под заглавието на продуктовата страница като кратко H2 подзаглавие/);
  assert.match(source, /под цената и преди опциите/);
});
