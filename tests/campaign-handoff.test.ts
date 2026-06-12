import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCampaignHandoffSignature,
  evaluateCampaignHandoff,
  parseCampaignHandoffQuery,
} from "@/lib/campaign-handoff";
import type { Product } from "@/lib/catalog";

const productId = "11111111-1111-4111-8111-111111111111";

const simpleProduct: Product = {
  slug: productId,
  title: "Пеперуда",
  description: "Описание",
  price: 19.5,
  images: [{ src: "/img.jpg", alt: "Пеперуда" }],
};

const configurableProduct: Product = {
  ...simpleProduct,
  colorFields: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      label: "Цвят",
      key: "color",
      groupId: "33333333-3333-4333-8333-333333333333",
      groupLabel: "Материал",
      minSelect: 1,
      maxSelect: 1,
      options: [
        {
          id: "44444444-4444-4444-4444-444444444444",
          name: "Розово",
          hex: "#f0c",
        },
      ],
    },
  ],
};

test("campaign handoff rejects forged price parameters", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    price: "1",
    discount: "90",
  });

  const result = evaluateCampaignHandoff(simpleProduct, query);
  assert.equal(result.status, "invalid");
});

test("campaign handoff accepts valid simple product configuration", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    source: "campaign-butterflies",
    landing: "https://promo.vemidi-crafts.com/butterflies",
    quantity: "2",
  });

  const result = evaluateCampaignHandoff(simpleProduct, query);
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    assert.equal(result.quantity, 2);
    assert.equal(result.attribution.source, "campaign-butterflies");
    assert.equal(result.attribution.campaign, "butterflies");
    assert.match(result.attribution.landingUrl ?? "", /promo\.vemidi-crafts\.com\/butterflies/);
    assert.equal(result.product.price, 19.5);
  }
});

test("campaign handoff redirects configurable products with missing required options", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
  });

  const result = evaluateCampaignHandoff(configurableProduct, query);
  assert.equal(result.status, "needs_configuration");
  if (result.status === "needs_configuration") {
    assert.match(result.redirectPath, /\/products\//);
    assert.ok(result.missing.length > 0);
  }
});

test("campaign handoff rejects unknown product options", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    "color_not-a-uuid": "44444444-4444-4444-8444-444444444444",
  });

  const result = evaluateCampaignHandoff(configurableProduct, query);
  assert.equal(result.status, "invalid");
});

test("campaign handoff rejects missing or unknown products", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
  });

  const result = evaluateCampaignHandoff(null, query);
  assert.equal(result.status, "invalid");
  if (result.status === "invalid") {
    assert.match(result.title, /не е наличен|не е намерен/i);
  }
});

test("campaign handoff rejects invalid quantity values", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    quantity: "0",
  });

  const zeroResult = evaluateCampaignHandoff(simpleProduct, query);
  assert.equal(zeroResult.status, "ready");
  if (zeroResult.status === "ready") {
    assert.equal(zeroResult.quantity, 1);
  }

  const hugeQuery = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    quantity: "9999",
  });
  const hugeResult = evaluateCampaignHandoff(simpleProduct, hugeQuery);
  assert.equal(hugeResult.status, "ready");
  if (hugeResult.status === "ready") {
    assert.equal(hugeResult.quantity, 99);
  }
});

test("campaign handoff requires a campaign identifier", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
  });

  const result = evaluateCampaignHandoff(simpleProduct, query);
  assert.equal(result.status, "invalid");
});

test("campaign handoff signature stays stable for refresh idempotency", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
  });
  const result = evaluateCampaignHandoff(simpleProduct, query);
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    const signature = buildCampaignHandoffSignature(result);
    assert.equal(signature, buildCampaignHandoffSignature(result));
  }
});
