import assert from "node:assert/strict";
import test from "node:test";

import {
  isEligibleUpsellProduct,
  mapProductUpsellOffer,
  normalizeUpsellQuantity,
  type ProductUpsellOfferRow,
} from "@/lib/storefront/product-upsells";
import { toProduct, type ProductRow } from "@/lib/storefront/mappers";

const baseProductRow: ProductRow = {
  id: "upsell-product",
  slug: "papionka-s-ime",
  product_code: "VM-UP-001",
  name: "Папийонка с име",
  heading_subtitle: null,
  subtitle: null,
  description: "Добавка към подарък",
  additional_info: null,
  fulfillment_note: null,
  personalization_info: null,
  dimensions_materials: null,
  ordering_info: null,
  price: 12,
  image_url: null,
  is_customizable: true,
  is_sold_out: false,
  status: "published",
  visibility: "upsell_only",
};

const baseOfferRow: ProductUpsellOfferRow = {
  id: "offer-1",
  source_product_id: "source-product",
  upsell_product_id: "upsell-product",
  offer_title: "Добавете папийонка",
  offer_description: "Специална цена при поръчка с албум.",
  special_price: 8,
  suggested_quantity: 2,
  max_quantity: 2,
  sort_order: 1,
  is_active: true,
  created_at: "2026-07-02T00:00:00.000Z",
};

test("normalizeUpsellQuantity keeps positive integer quantities", () => {
  assert.equal(normalizeUpsellQuantity(2.9), 2);
  assert.equal(normalizeUpsellQuantity("3"), 3);
  assert.equal(normalizeUpsellQuantity(0), 1);
  assert.equal(normalizeUpsellQuantity("bad", 2), 2);
});

test("mapProductUpsellOffer clamps suggested quantity to max quantity", () => {
  const product = toProduct(baseProductRow);
  const offer = mapProductUpsellOffer(
    { ...baseOfferRow, suggested_quantity: 5, max_quantity: 2 },
    product,
  );

  assert.equal(offer.title, "Добавете папийонка");
  assert.equal(offer.description, "Специална цена при поръчка с албум.");
  assert.equal(offer.specialPrice, 8);
  assert.equal(offer.suggestedQuantity, 2);
  assert.equal(offer.maxQuantity, 2);
  assert.equal(offer.product.id, "upsell-product");
});

test("isEligibleUpsellProduct allows published upsell-only targets", () => {
  assert.equal(isEligibleUpsellProduct(baseProductRow), true);
  assert.equal(
    isEligibleUpsellProduct({ ...baseProductRow, visibility: "public" }),
    true,
  );
  assert.equal(
    isEligibleUpsellProduct({ ...baseProductRow, status: "draft" }),
    false,
  );
});
