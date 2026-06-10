import assert from "node:assert/strict";
import test from "node:test";

import { toProduct, type ProductRow } from "@/lib/storefront/mappers";

const productRow: ProductRow = {
  id: "product-1",
  name: "Подаръчна кутия",
  description: "Описание",
  price: 29.9,
  image_url: "https://example.com/legacy.webp",
  is_customizable: true,
};

test("product gallery puts the primary image first and preserves gallery order", () => {
  const product = toProduct(productRow, [
    {
      id: "image-2",
      product_id: productRow.id,
      image_url: "https://example.com/second.webp",
      alt_text: null,
      sort_order: 20,
      is_primary: false,
    },
    {
      id: "image-1",
      product_id: productRow.id,
      image_url: "https://example.com/cover.webp",
      alt_text: "Основна снимка",
      sort_order: 30,
      is_primary: true,
    },
    {
      id: "image-3",
      product_id: productRow.id,
      image_url: "https://example.com/first.webp",
      alt_text: null,
      sort_order: 10,
      is_primary: false,
    },
  ]);

  assert.deepEqual(product.images, [
    {
      src: "https://example.com/cover.webp",
      alt: "Основна снимка",
    },
    {
      src: "https://example.com/first.webp",
      alt: productRow.name,
    },
    {
      src: "https://example.com/second.webp",
      alt: productRow.name,
    },
  ]);
});

test("products without gallery rows keep the legacy image", () => {
  const product = toProduct(productRow);

  assert.deepEqual(product.images, [
    {
      src: productRow.image_url,
      alt: productRow.name,
    },
  ]);
});
