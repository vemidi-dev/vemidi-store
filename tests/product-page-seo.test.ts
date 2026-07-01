import assert from "node:assert/strict";
import test from "node:test";

import type { Product } from "@/lib/catalog";
import {
  buildBreadcrumbListSchema,
  buildProductBreadcrumbItems,
} from "@/lib/seo/breadcrumbs";
import {
  buildProductMetaDescription,
  buildProductSchemaDescription,
} from "@/lib/seo/product-description-seo";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { buildProductPageMetadata } from "@/lib/seo/product-metadata";
import { resolveProductPageSeo } from "@/lib/seo/product-page-seo";
import type { StorefrontCatalog } from "@/lib/storefront/types";

const product: Product = {
  id: "prod-1",
  slug: "personalizirana-kutiya",
  productCode: "VM-000001",
  title: "Персонализирана кутия",
  description: "Ръчно изработена кутия с име и послание.",
  price: 29.9,
  fulfillmentType: "made_to_order",
  availabilityLabel: "По поръчка",
  orderable: true,
  images: [
    {
      src: "https://cdn.example.com/products/kutiya.jpg",
      alt: "Персонализирана кутия",
    },
  ],
};

const seoContext = {
  primaryCategory: { name: "Кутии", slug: "kutii" },
};

const catalog: StorefrontCatalog = {
  categories: [
    {
      id: "boxes",
      name: "Кутии",
      slug: "kutii",
      category_type: "product",
      parent_id: null,
      show_on_home: true,
      home_sort_order: 1,
      card_description: null,
      createdAt: null,
    },
  ],
  products: [
    {
      id: product.id,
      slug: product.slug,
      productCode: product.productCode,
      title: product.title,
      description: product.description,
      price: product.price,
      fulfillmentType: product.fulfillmentType,
      availabilityLabel: product.availabilityLabel,
      orderable: product.orderable,
      images: product.images,
      categorySlugs: ["kutii"],
      primaryCategoryId: "boxes",
      updatedAt: null,
      createdAt: null,
    },
  ],
  featuredProductIds: [],
  relatedProductIdsByProductId: new Map(),
  relatedCategoryIdsByCategoryId: new Map(),
};

test("product metadata uses one normalized description across meta og and twitter", () => {
  const metadata = buildProductPageMetadata(product, product.slug, seoContext);
  const openGraph = metadata.openGraph as { description?: string };
  const twitter = metadata.twitter as { description?: string };
  const expected = buildProductMetaDescription(product, seoContext);

  assert.equal(metadata.description, expected);
  assert.equal(openGraph.description, expected);
  assert.equal(twitter.description, expected);
});

test("thin product schema description reuses composed meta fallback", () => {
  const schemaDescription = buildProductSchemaDescription(product, seoContext);
  const metaDescription = buildProductMetaDescription(product, seoContext);

  assert.equal(schemaDescription, metaDescription);
  assert.ok(!schemaDescription.includes("\r"));
  assert.ok(!schemaDescription.includes("\n"));
});

test("long product schema description keeps full normalized body while meta truncates", () => {
  const longProduct: Product = {
    ...product,
    description:
      "Дървен плик за пари с персонален надпис и избор на цвят. Подходящ за сватба, кръщене и рожден ден. Изработка 5–10 работни дни. Ръчна изработка от VeMiDi crafts с внимание към детайла и качеството на материалите.",
  };

  const meta = buildProductMetaDescription(longProduct, seoContext);
  const schema = buildProductSchemaDescription(longProduct, seoContext);

  assert.ok(meta);
  assert.ok(schema.length > (meta?.length ?? 0));
  assert.ok(!schema.includes("\r\n"));
});

test("json-ld serialization escapes unsafe characters in descriptions", () => {
  const payload = serializeJsonLd({
    "@type": "Product",
    description: 'Плик <script>alert("x")</script> & подарък',
  });

  assert.ok(!payload.includes("<script>"));
  assert.ok(payload.includes("\\u003c"));
});

test("product breadcrumb without category falls back to shop path", () => {
  const items = buildProductBreadcrumbItems([], {
    title: product.title,
    slug: product.slug,
    categorySlugs: [],
  });

  assert.deepEqual(
    items.map((item) => item.path),
    ["/", "/produkti", "/produkti/personalizirana-kutiya"],
  );
});

test("visible breadcrumb items match BreadcrumbList schema names", () => {
  const { breadcrumbItems } = resolveProductPageSeo(catalog, product);
  const schema = buildBreadcrumbListSchema(
    breadcrumbItems,
    new URL("https://vemidi-store.vercel.app"),
  );

  assert.equal(breadcrumbItems.length, schema.itemListElement.length);
  assert.deepEqual(
    breadcrumbItems.map((item) => item.name),
    schema.itemListElement.map((entry) => entry.name),
  );
  assert.equal(
    schema.itemListElement.at(-1)?.item,
    "https://vemidi-store.vercel.app/produkti/personalizirana-kutiya",
  );
});
