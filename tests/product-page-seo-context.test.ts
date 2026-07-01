import assert from "node:assert/strict";
import test from "node:test";

import { resolveProductPageSeo } from "@/lib/seo/product-page-seo";
import type { StorefrontCatalog } from "@/lib/storefront/types";

const catalog: StorefrontCatalog = {
  categories: [
    {
      id: "parent",
      name: "Бижута",
      slug: "bijuta",
      category_type: "product",
      parent_id: null,
      show_on_home: true,
      home_sort_order: 1,
      card_description: null,
      createdAt: null,
    },
    {
      id: "child",
      name: "Обеци",
      slug: "obetsi",
      category_type: "product",
      parent_id: "parent",
      show_on_home: false,
      home_sort_order: 1,
      card_description: null,
      createdAt: null,
    },
  ],
  products: [
    {
      id: "prod-1",
      slug: "sreburen-medalyon",
      productCode: "VM-000010",
      title: "Сребърен медальон",
      description: "Описание.",
      price: 19.9,
      fulfillmentType: "made_to_order",
      availabilityLabel: "По поръчка",
      orderable: true,
      images: [],
      categorySlugs: ["obetsi", "bijuta"],
      primaryCategoryId: "parent",
      updatedAt: null,
      createdAt: null,
    },
  ],
  featuredProductIds: [],
  relatedProductIdsByProductId: new Map(),
  relatedCategoryIdsByCategoryId: new Map(),
};

test("resolveProductPageSeo prefers explicit primary category for breadcrumbs and context", () => {
  const product = catalog.products[0];
  const resolution = resolveProductPageSeo(catalog, product);

  assert.equal(resolution.primaryCategory?.slug, "bijuta");
  assert.deepEqual(
    resolution.breadcrumbItems.map((item) => item.path),
    ["/", "/categorii", "/categorii/bijuta", "/produkti/sreburen-medalyon"],
  );
  assert.equal(resolution.seoContext.primaryCategory?.slug, "bijuta");
});
