import assert from "node:assert/strict";
import test from "node:test";

import type { Product } from "@/lib/catalog";
import { buildProductPageMetadata } from "@/lib/seo/product-metadata";

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

test("product metadata includes canonical, Open Graph and Twitter fields", () => {
  const metadata = buildProductPageMetadata(product, product.slug, {
    primaryCategory: { name: "Кутии", slug: "kutii" },
  });
  const openGraph = metadata.openGraph as {
    type?: string;
    title?: string;
    url?: string;
    siteName?: string;
    images?: Array<{ url: string; alt: string }>;
    description?: string;
  };
  const twitter = metadata.twitter as {
    card?: string;
    images?: string[];
    description?: string;
  };

  assert.equal(metadata.title, product.title);
  assert.ok(metadata.description && metadata.description.length >= 40);
  assert.equal(openGraph.description, metadata.description);
  assert.equal(twitter.description, metadata.description);
  assert.equal(metadata.alternates?.canonical, "/produkti/personalizirana-kutiya");
  assert.equal(openGraph.type, "website");
  assert.equal(openGraph.title, product.title);
  assert.equal(openGraph.url, "/produkti/personalizirana-kutiya");
  assert.equal(openGraph.siteName, "VeMiDi crafts");
  assert.deepEqual(openGraph.images, [
    { url: product.images[0].src, alt: product.title },
  ]);
  assert.equal(twitter.card, "summary_large_image");
  assert.deepEqual(twitter.images, [product.images[0].src]);
});

test("product metadata omits image fields when product has no image", () => {
  const metadata = buildProductPageMetadata(
    { ...product, images: [] },
    product.slug,
  );
  const twitter = metadata.twitter as { card?: string; images?: string[] };

  assert.equal(metadata.openGraph?.images, undefined);
  assert.equal(twitter.images, undefined);
  assert.equal(twitter.card, "summary");
});
