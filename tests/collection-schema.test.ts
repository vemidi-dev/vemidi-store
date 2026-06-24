import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBreadcrumbListSchema,
  buildCategoryBreadcrumbItems,
  buildOccasionBreadcrumbItems,
} from "@/lib/seo/breadcrumbs";
import { buildCategoryMetaDescription } from "@/lib/seo/category-description-seo";
import {
  buildCollectionPageSchema,
  shouldRenderCollectionSchema,
} from "@/lib/seo/collection-schema";
import { compactJsonLd } from "@/lib/seo/json-ld";
import type { StorefrontCategory } from "@/lib/storefront/types";

const siteUrl = new URL("https://vemidi-crafts.com");

const category: StorefrontCategory = {
  id: "jewelry",
  name: "Бижута",
  slug: "bijuta",
  category_type: "product",
  parent_id: null,
  show_on_home: true,
  home_sort_order: 1,
  card_description: "Ръчно изработени бижута.",
  createdAt: null,
};

const occasion: StorefrontCategory = {
  id: "occ-1",
  name: "Сватба",
  slug: "svatba",
  category_type: "occasion",
  parent_id: null,
  show_on_home: true,
  home_sort_order: 1,
  card_description: "Подаръци за сватбен ден.",
  createdAt: null,
};

const products = [
  {
    title: "Сребърен медальон",
    slug: "sreburen-medalyon",
    imageSrc: "/assets/medalyon.webp",
  },
  {
    title: "Златна гривна",
    slug: "zlatna-grivna",
    imageSrc: null,
  },
];

function buildCategoryCollectionSchema() {
  return buildCollectionPageSchema({
    name: category.name,
    description: buildCategoryMetaDescription(category),
    canonicalPath: "/categorii/bijuta",
    products,
    siteUrl,
  });
}

function buildOccasionCollectionSchema() {
  return buildCollectionPageSchema({
    name: occasion.name,
    description: occasion.card_description ?? "",
    canonicalPath: "/povodi/svatba",
    products,
    siteUrl,
  });
}

test("category CollectionPage includes ItemList with sequential positions", () => {
  const schema = buildCategoryCollectionSchema();

  assert.equal(schema["@type"], "CollectionPage");
  assert.equal(schema.name, "Бижута");
  assert.equal(schema.description, "Ръчно изработени бижута.");
  assert.equal(schema.url, `${siteUrl.origin}/categorii/bijuta`);
  assert.equal(schema.mainEntity["@type"], "ItemList");
  assert.equal(schema.mainEntity.numberOfItems, 2);
  assert.equal(schema.mainEntity.itemListElement.length, 2);
  assert.equal(schema.mainEntity.itemListElement[0]?.position, 1);
  assert.equal(schema.mainEntity.itemListElement[1]?.position, 2);
});

test("occasion CollectionPage includes ItemList with sequential positions", () => {
  const schema = buildOccasionCollectionSchema();

  assert.equal(schema["@type"], "CollectionPage");
  assert.equal(schema.name, "Сватба");
  assert.equal(schema.url, `${siteUrl.origin}/povodi/svatba`);
  assert.equal(schema.mainEntity["@type"], "ItemList");
  assert.equal(schema.mainEntity.numberOfItems, 2);
});

test("ItemList product entries use absolute canonical product urls", () => {
  const schema = buildCategoryCollectionSchema();
  const firstItem = schema.mainEntity.itemListElement[0]?.item as Record<
    string,
    string
  >;

  assert.equal(firstItem.name, "Сребърен медальон");
  assert.equal(
    firstItem.url,
    `${siteUrl.origin}/produkti/sreburen-medalyon`,
  );
  assert.equal(
    firstItem.image,
    `${siteUrl.origin}/assets/medalyon.webp`,
  );
});

test("product without image omits image property from ItemList entry", () => {
  const schema = compactJsonLd(buildCategoryCollectionSchema()) as {
    mainEntity: {
      itemListElement: Array<{ item: Record<string, string> }>;
    };
  };
  const secondItem = schema.mainEntity.itemListElement[1]?.item;

  assert.equal(secondItem.name, "Златна гривна");
  assert.equal(secondItem.url, `${siteUrl.origin}/produkti/zlatna-grivna`);
  assert.equal("image" in secondItem, false);
});

test("empty product list is not eligible for collection schema", () => {
  assert.equal(
    shouldRenderCollectionSchema({
      indexable: true,
      faceted: false,
      products: [],
    }),
    false,
  );
});

test("faceted category page does not render collection schema", () => {
  assert.equal(
    shouldRenderCollectionSchema({
      indexable: true,
      faceted: true,
      products,
    }),
    false,
  );
});

test("non-indexable category page does not render collection schema", () => {
  assert.equal(
    shouldRenderCollectionSchema({
      indexable: false,
      faceted: false,
      products,
    }),
    false,
  );
});

test("breadcrumb schema remains available alongside collection schema", () => {
  const breadcrumbSchema = buildBreadcrumbListSchema(
    buildCategoryBreadcrumbItems([category], category),
    siteUrl,
  );
  const collectionSchema = buildCategoryCollectionSchema();

  assert.equal(breadcrumbSchema["@type"], "BreadcrumbList");
  assert.equal(collectionSchema["@type"], "CollectionPage");
  assert.equal(breadcrumbSchema.itemListElement.length, 3);
});

test("occasion breadcrumb remains available alongside collection schema", () => {
  const breadcrumbSchema = buildBreadcrumbListSchema(
    buildOccasionBreadcrumbItems(occasion),
    siteUrl,
  );
  const collectionSchema = buildOccasionCollectionSchema();

  assert.equal(breadcrumbSchema["@type"], "BreadcrumbList");
  assert.equal(collectionSchema["@type"], "CollectionPage");
  assert.equal(breadcrumbSchema.itemListElement.length, 3);
});

test("ItemList entries use Thing rather than Product schema types", () => {
  const schema = buildCategoryCollectionSchema();
  const item = schema.mainEntity.itemListElement[0]?.item as Record<
    string,
    string
  >;

  assert.equal(item["@type"], "Thing");
  assert.equal("offers" in item, false);
});
