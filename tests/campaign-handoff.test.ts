import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCampaignHandoffSignature,
  evaluateCampaignHandoff,
  getCampaignProductPageOptionSelections,
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
    landing: "https://special.vemidi-crafts.com/valshebni-peperudi",
    quantity: "2",
  });

  const result = evaluateCampaignHandoff(simpleProduct, query);
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    assert.equal(result.quantity, 2);
    assert.equal(result.attribution.source, "campaign-butterflies");
    assert.equal(result.attribution.campaign, "butterflies");
    assert.match(
      result.attribution.landingUrl ?? "",
      /special\.vemidi-crafts\.com\/valshebni-peperudi/,
    );
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

const groupKitSizeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01";
const groupColoringId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02";
const groupExtrasId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03";
const groupChildNameId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa04";
const groupPersonalizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa05";

const valueMiniId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01";
const valueStandardId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02";
const valueMaxiId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03";
const valuePaintsId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04";
const valueMarkersId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb05";
const valueStickerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb06";
const valueRibbonId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb07";
const valuePersonalizationNoId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb08";
const valuePersonalizationYesId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb09";

const optionsProduct: Product = {
  ...simpleProduct,
  optionGroups: [
    {
      id: groupKitSizeId,
      name: "Размер на комплекта",
      key: "kit_size",
      inputType: "single",
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      sortOrder: 0,
      isActive: true,
      pricingMode: "delta",
      textPriceDelta: 0,
      values: [
        {
          id: valueMiniId,
          label: "Мини",
          key: "mini",
          priceDelta: 0,
          isDefault: true,
          isActive: true,
          isSoldOut: false,
          sortOrder: 0,
        },
        {
          id: valueStandardId,
          label: "Стандарт",
          key: "standard",
          priceDelta: 5,
          isDefault: false,
          isActive: true,
          isSoldOut: false,
          sortOrder: 1,
        },
        {
          id: valueMaxiId,
          label: "Макси",
          key: "maxi",
          priceDelta: 10,
          isDefault: false,
          isActive: true,
          isSoldOut: true,
          sortOrder: 2,
        },
      ],
    },
    {
      id: groupColoringId,
      name: "Оцветяване",
      key: "coloring",
      inputType: "single",
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      sortOrder: 1,
      isActive: true,
      pricingMode: "delta",
      textPriceDelta: 0,
      values: [
        {
          id: valuePaintsId,
          label: "Бои",
          key: "paints",
          priceDelta: 0,
          isDefault: true,
          isActive: true,
          isSoldOut: false,
          sortOrder: 0,
        },
        {
          id: valueMarkersId,
          label: "Маркери",
          key: "markers",
          priceDelta: 2,
          isDefault: false,
          isActive: true,
          isSoldOut: false,
          sortOrder: 1,
        },
      ],
    },
    {
      id: groupExtrasId,
      name: "Добавки",
      key: "extras",
      inputType: "multiple",
      isRequired: false,
      minSelect: 0,
      maxSelect: 2,
      sortOrder: 2,
      isActive: true,
      pricingMode: "delta",
      textPriceDelta: 0,
      values: [
        {
          id: valueStickerId,
          label: "Стикер",
          key: "sticker",
          priceDelta: 1,
          isDefault: false,
          isActive: true,
          isSoldOut: false,
          sortOrder: 0,
        },
        {
          id: valueRibbonId,
          label: "Панделка",
          key: "ribbon",
          priceDelta: 1.5,
          isDefault: false,
          isActive: true,
          isSoldOut: false,
          sortOrder: 1,
        },
      ],
    },
    {
      id: groupPersonalizationId,
      name: "Персонализация",
      key: "personalization",
      inputType: "single",
      isRequired: false,
      minSelect: 0,
      maxSelect: 1,
      sortOrder: 3,
      isActive: true,
      pricingMode: "delta",
      textPriceDelta: 0,
      values: [
        {
          id: valuePersonalizationNoId,
          label: "Без персонализация",
          key: "no",
          priceDelta: 0,
          isDefault: true,
          isActive: true,
          isSoldOut: false,
          sortOrder: 0,
        },
        {
          id: valuePersonalizationYesId,
          label: "С персонализация",
          key: "yes",
          priceDelta: 2.5,
          isDefault: false,
          isActive: true,
          isSoldOut: false,
          sortOrder: 1,
        },
      ],
    },
    {
      id: groupChildNameId,
      name: "Име на детето",
      key: "child_name",
      inputType: "text",
      isRequired: false,
      minSelect: 0,
      maxSelect: 0,
      sortOrder: 4,
      isActive: true,
      pricingMode: "delta",
      dependsOnOptionId: valuePersonalizationYesId,
      textPriceDelta: 0,
      maxLength: 50,
      values: [],
    },
  ],
};

test("campaign handoff accepts valid single option via group and value keys", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    source: "campaign-butterflies",
    landing: "https://special.vemidi-crafts.com/valshebni-peperudi",
    option_kit_size: "mini",
    option_coloring: "markers",
  });

  const result = evaluateCampaignHandoff(optionsProduct, query);
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    assert.deepEqual(result.optionSelections, [
      { groupId: groupKitSizeId, valueIds: [valueMiniId] },
      { groupId: groupColoringId, valueIds: [valueMarkersId] },
    ]);
  }
});

test("campaign handoff accepts multiple comma-separated value keys", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    option_kit_size: "standard",
    option_coloring: "paints",
    option_extras: "sticker,ribbon",
  });

  const result = evaluateCampaignHandoff(optionsProduct, query);
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    const extras = result.optionSelections?.find(
      (selection) => selection.groupId === groupExtrasId,
    );
    assert.deepEqual(extras?.valueIds, [valueStickerId, valueRibbonId]);
  }
});

test("campaign handoff accepts valid text option via group key", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    option_kit_size: "mini",
    option_coloring: "paints",
    option_personalization: "yes",
    option_text_child_name: encodeURIComponent("Мария"),
  });

  const result = evaluateCampaignHandoff(optionsProduct, query);
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    const textSelection = result.optionSelections?.find(
      (selection) => selection.groupId === groupChildNameId,
    );
    assert.equal(textSelection?.textValue, "Мария");
  }
});

test("campaign handoff rejects unknown group key", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    option_unknown_group: "mini",
  });

  const result = evaluateCampaignHandoff(optionsProduct, query);
  assert.equal(result.status, "invalid");
  if (result.status === "invalid") {
    assert.match(result.message, /Непозната група опции/i);
  }
});

test("campaign handoff rejects unknown value key", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    option_kit_size: "giant",
    option_coloring: "paints",
  });

  const result = evaluateCampaignHandoff(optionsProduct, query);
  assert.equal(result.status, "invalid");
  if (result.status === "invalid") {
    assert.match(result.message, /Непозната стойност/i);
  }
});

test("campaign handoff rejects sold out value key", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    option_kit_size: "maxi",
    option_coloring: "paints",
  });

  const result = evaluateCampaignHandoff(optionsProduct, query);
  assert.equal(result.status, "invalid");
  if (result.status === "invalid") {
    assert.match(result.message, /изчерпана/i);
  }
});

test("campaign handoff rejects group key that does not belong to the product", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    option_other_product_group: "value",
  });

  const result = evaluateCampaignHandoff(optionsProduct, query);
  assert.equal(result.status, "invalid");
  if (result.status === "invalid") {
    assert.match(result.message, /Непозната група опции/i);
  }
});

test("campaign handoff rejects uuid and key parameters for the same group", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    [`opt_${groupKitSizeId}`]: valueMiniId,
    option_kit_size: "mini",
    option_coloring: "paints",
  });

  const result = evaluateCampaignHandoff(optionsProduct, query);
  assert.equal(result.status, "invalid");
  if (result.status === "invalid") {
    assert.match(result.message, /едновременно UUID и ключ/i);
  }
});

test("campaign handoff redirects when required option key is missing", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    option_coloring: "paints",
  });

  const result = evaluateCampaignHandoff(optionsProduct, query);
  assert.equal(result.status, "needs_configuration");
  if (result.status === "needs_configuration") {
    const redirect = new URL(result.redirectPath, "https://vemidi-crafts.com");
    assert.equal(
      redirect.searchParams.get(`opt_${groupColoringId}`),
      valuePaintsId,
    );
  }
});

test("product page preselects safe key-based campaign options", () => {
  const selections = getCampaignProductPageOptionSelections(optionsProduct, {
    campaign: "butterflies",
    source: "campaign-butterflies",
    option_kit_size: "standard",
    option_coloring: "markers",
    option_personalization: "yes",
  });

  assert.deepEqual(selections, [
    { groupId: groupKitSizeId, valueIds: [valueStandardId] },
    { groupId: groupColoringId, valueIds: [valueMarkersId] },
    {
      groupId: groupPersonalizationId,
      valueIds: [valuePersonalizationYesId],
    },
  ]);
});

test("malformed text encoding does not crash campaign query parsing", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    option_text_child_name: "100%",
  });

  assert.equal(query.optionTextByGroupKey.get("child_name"), "100%");
});

test("campaign handoff rejects blocked price parameter alongside option keys", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    option_kit_size: "mini",
    option_coloring: "paints",
    price: "9.99",
  });

  const result = evaluateCampaignHandoff(optionsProduct, query);
  assert.equal(result.status, "invalid");
});

test("campaign handoff continues to accept legacy uuid option format", () => {
  const query = parseCampaignHandoffQuery({
    product: productId,
    campaign: "butterflies",
    [`opt_${groupKitSizeId}`]: valueStandardId,
    [`opt_${groupColoringId}`]: valueMarkersId,
  });

  const result = evaluateCampaignHandoff(optionsProduct, query);
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    assert.deepEqual(result.optionSelections, [
      { groupId: groupKitSizeId, valueIds: [valueStandardId] },
      { groupId: groupColoringId, valueIds: [valueMarkersId] },
    ]);
  }
});
