import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCartLineDisplaySnapshot,
  buildCartLineOptionDisplayRows,
  parseCartLineDisplaySnapshot,
} from "@/lib/cart/build-cart-line-display";
import {
  buildSelectedColorSummaryRows,
  cartLineSummaryIncludesCampaign,
  resolveCartLineSummaryRows,
} from "@/lib/cart/cart-line-summary";
import { parseStoredCart } from "@/lib/cart-storage";
import { prepareCartLineInput } from "@/lib/cart/prepare-cart-line";
import type { CartLine } from "@/lib/cart-types";
import type { Product } from "@/lib/catalog";
import type { ProductOptionGroup } from "@/lib/product-options";

const productId = "11111111-1111-4111-8111-111111111111";
const groupSizeId = "22222222-2222-4222-8222-222222222222";
const groupColoringId = "33333333-3333-4333-8333-333333333333";
const groupPersonalizationId = "44444444-4444-4444-8444-444444444444";
const groupChildNameId = "55555555-5555-4555-8555-555555555555";
const valueMediumId = "66666666-6666-4666-8666-666666666666";
const valuePaintsId = "77777777-7777-4777-8777-777777777777";
const valueMarkersId = "88888888-8888-4888-8888-888888888888";
const valuePersonalizationNoId = "99999999-9999-4999-8999-999999999999";
const valuePersonalizationYesId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const optionGroups: ProductOptionGroup[] = [
  {
    id: groupSizeId,
    name: "Размер на комплекта",
    key: "size",
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
        id: valueMediumId,
        label: "Среден комплект",
        key: "medium",
        priceDelta: 0,
        isDefault: true,
        isActive: true,
        isSoldOut: false,
        sortOrder: 0,
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
    sortOrder: 2,
    isActive: true,
    pricingMode: "delta",
    textPriceDelta: 0,
    values: [
      {
        id: valuePaintsId,
        label: "Боички",
        key: "paints",
        priceDelta: 0,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
        sortOrder: 0,
      },
      {
        id: valueMarkersId,
        label: "Маркери",
        key: "markers",
        priceDelta: 0,
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
    name: "Име",
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
];

const product: Product = {
  id: productId,
  slug: "tvorcheski-komplekt-valshebni-peperudi",
  productCode: "VM-000010",
  title: "Творчески комплект",
  description: "Описание",
  price: 19.5,
  images: [{ src: "/img.jpg", alt: "Комплект" }],
  optionGroups,
  fulfillmentType: "made_to_order",
  availabilityLabel: "Изработва се по поръчка",
  orderable: true,
};

const optionSelections = [
  { groupId: groupSizeId, valueIds: [valueMediumId] },
  { groupId: groupColoringId, valueIds: [valuePaintsId] },
  { groupId: groupPersonalizationId, valueIds: [valuePersonalizationYesId] },
  { groupId: groupChildNameId, valueIds: [], textValue: "Мария" },
];

test("buildCartLineOptionDisplayRows captures size and coloring labels", () => {
  const rows = buildCartLineOptionDisplayRows(optionGroups, optionSelections);

  assert.deepEqual(rows, [
    { label: "Размер на комплекта", value: "Среден комплект" },
    { label: "Оцветяване", value: "Боички" },
    { label: "Персонализация", value: "С персонализация" },
    { label: "Име", value: "Мария" },
  ]);
});

test("prepareCartLineInput stores display snapshot in cart line", () => {
  const prepared = prepareCartLineInput({
    product,
    quantity: 1,
    optionSelections,
    attribution: {
      source: "campaign-butterflies",
      campaign: "butterflies",
    },
  });

  assert.ok(prepared);
  assert.deepEqual(prepared!.line.displaySnapshot?.optionRows, [
    { label: "Размер на комплекта", value: "Среден комплект" },
    { label: "Оцветяване", value: "Боички" },
    { label: "Персонализация", value: "С персонализация" },
    { label: "Име", value: "Мария" },
  ]);
  assert.equal(prepared!.line.campaign, "butterflies");
});

test("legacy cart line without display snapshot uses safe fallback rows", () => {
  const line: CartLine = {
    lineId: "legacy-line",
    productId,
    slug: product.slug,
    title: product.title,
    price: 19.5,
    quantity: 1,
    campaign: "butterflies",
    optionSelections: [
      { groupId: groupColoringId, valueIds: [valuePaintsId] },
    ],
  };

  const rows = resolveCartLineSummaryRows(line);

  assert.deepEqual(rows, [
    { label: "Опция", value: "1 избора" },
  ]);
  assert.equal(line.campaign, "butterflies");
  assert.equal(cartLineSummaryIncludesCampaign(line), false);
});

test("campaign attribution stays on line but is hidden from customer summary", () => {
  const prepared = prepareCartLineInput({
    product,
    quantity: 1,
    optionSelections,
    attribution: {
      source: "campaign-butterflies",
      campaign: "butterflies",
      landingUrl: "https://special.vemidi-crafts.com/valshebni-peperudi",
    },
  });

  assert.ok(prepared);
  assert.equal(prepared!.line.campaign, "butterflies");
  assert.equal(prepared!.line.landingUrl, "https://special.vemidi-crafts.com/valshebni-peperudi");

  const rows = resolveCartLineSummaryRows(prepared!.line);
  assert.equal(rows.some((row) => row.label.includes("Кампания")), false);
  assert.equal(cartLineSummaryIncludesCampaign(prepared!.line), false);
});

test("parseStoredCart preserves display snapshot from localStorage", () => {
  const snapshot = buildCartLineDisplaySnapshot({
    optionGroups,
    optionSelections,
  });
  const stored = JSON.stringify([
    {
      productId,
      slug: product.slug,
      title: product.title,
      price: 19.5,
      quantity: 2,
      optionSelections,
      displaySnapshot: snapshot,
      campaign: "butterflies",
    },
  ]);

  const [line] = parseStoredCart(stored);
  assert.ok(line);
  assert.deepEqual(line!.displaySnapshot?.optionRows[0], {
    label: "Размер на комплекта",
    value: "Среден комплект",
  });
  assert.equal(line!.campaign, "butterflies");
});

test("parseCartLineDisplaySnapshot rejects malformed snapshot payloads", () => {
  assert.equal(parseCartLineDisplaySnapshot(null), undefined);
  assert.equal(parseCartLineDisplaySnapshot({ optionRows: [{ label: "", value: "x" }] }), undefined);
});

const ribbonColorFieldId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ribbonRedOptionId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const selectedRibbonColor = {
  fieldId: ribbonColorFieldId,
  fieldLabel: "Цвят на панделката и подложката",
  groupId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  groupKey: "ribbon",
  groupLabel: "Панделка",
  optionId: ribbonRedOptionId,
  optionName: "Червен",
  optionHex: "#c00000",
};

test("resolveCartLineSummaryRows includes selected colors when display snapshot exists", () => {
  const line: CartLine = {
    lineId: "color-with-snapshot",
    productId,
    slug: product.slug,
    title: product.title,
    price: 19.5,
    quantity: 1,
    displaySnapshot: {
      optionRows: [
        { label: "Размер на комплекта", value: "Среден комплект" },
        { label: "Оцветяване", value: "Боички" },
      ],
    },
    selectedColors: [selectedRibbonColor],
    personalizationFields: [
      { fieldId: "name-field", fieldKey: "name", label: "Име", value: "Иван" },
    ],
  };

  const rows = resolveCartLineSummaryRows(line);

  assert.deepEqual(rows, [
    { label: "Размер на комплекта", value: "Среден комплект" },
    { label: "Оцветяване", value: "Боички" },
    {
      label: "Цвят на панделката и подложката",
      value: "Червен",
    },
    { label: "Име", value: "Иван" },
  ]);
});

test("resolveCartLineSummaryRows shows quantity color mode summary", () => {
  const line: CartLine = {
    lineId: "color-quantity",
    productId,
    slug: product.slug,
    title: product.title,
    price: 19.5,
    quantity: 1,
    displaySnapshot: {
      optionRows: [{ label: "Размер", value: "Голям" }],
    },
    selectedColors: [
      { ...selectedRibbonColor, optionName: "Червен", quantity: 2 },
      {
        ...selectedRibbonColor,
        optionId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        optionName: "Бял",
        quantity: 1,
      },
    ],
  };

  const rows = resolveCartLineSummaryRows(line);

  assert.equal(
    rows.find((row) => row.label === "Цвят на панделката и подложката")?.value,
    "Червен × 2, Бял × 1",
  );
});

test("legacy cart line without display snapshot still shows selected colors", () => {
  const line: CartLine = {
    lineId: "legacy-colors",
    productId,
    slug: product.slug,
    title: product.title,
    price: 19.5,
    quantity: 1,
    selectedColors: [selectedRibbonColor],
    optionSelections: [
      { groupId: groupColoringId, valueIds: [valuePaintsId] },
    ],
  };

  const rows = resolveCartLineSummaryRows(line);

  assert.deepEqual(rows, [
    { label: "Опция", value: "1 избора" },
    {
      label: "Цвят на панделката и подложката",
      value: "Червен",
    },
  ]);
});

test("legacy personalization summary remains when personalizationFields are absent", () => {
  const line: CartLine = {
    lineId: "legacy-personalization",
    productId,
    slug: product.slug,
    title: product.title,
    price: 19.5,
    quantity: 1,
    personalization: "С честит рожден ден!",
    selectedColors: [selectedRibbonColor],
  };

  const rows = resolveCartLineSummaryRows(line);

  assert.deepEqual(rows, [
    {
      label: "Цвят на панделката и подложката",
      value: "Червен",
    },
    { label: "Персонализация", value: "С честит рожден ден!" },
  ]);
});

test("buildSelectedColorSummaryRows skips colors already present in snapshot rows", () => {
  const existingRows = [
    {
      label: "Цвят на панделката и подложката",
      value: "Червен",
    },
  ];

  const rows = buildSelectedColorSummaryRows([selectedRibbonColor], existingRows);

  assert.deepEqual(rows, []);
});
