import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { mapProductOptionGroups } from "@/lib/storefront/option-groups";
import {
  optionValueSupportsMaterialCard,
  shouldUseMaterialOptionCards,
} from "@/lib/product-option-layout";
import type { ProductOptionGroup } from "@/lib/product-options";
import {
  ADMIN_VARIANT_LINK_LABEL,
  ADMIN_VARIANTS_TAB_LABEL,
  DEFAULT_VARIANT_DISPLAY_SIZE,
  DEFAULT_VARIANT_GROUP_KEY,
  DEFAULT_VARIANT_GROUP_NAME,
  normalizeVariantDisplaySize,
  resolveOptionGroupVariantDisplaySize,
  slugifyVariantGroupKey,
  variantDisplaySizeGridClass,
} from "@/lib/product-variants";
import { normalizeProductMaterialRow } from "@/lib/admin/variant-data";

const root = resolve(process.cwd());

test("admin tab remains materials key with Варианти label", () => {
  const header = readFileSync(
    resolve(root, "components/admin/admin-header.tsx"),
    "utf8",
  );
  assert.match(header, /tab:\s*"materials"/);
  assert.match(header, new RegExp(`label:\\s*"${ADMIN_VARIANTS_TAB_LABEL}"`));
});

test("variant group slugify and default material group", () => {
  assert.equal(DEFAULT_VARIANT_GROUP_KEY, "material");
  assert.equal(DEFAULT_VARIANT_GROUP_NAME, "Материал");
  assert.equal(slugifyVariantGroupKey("Вид комплект"), "vid_komplekt");
  assert.equal(slugifyVariantGroupKey("Стил"), "stil");
});

test("normalizeProductMaterialRow falls back to medium and group", () => {
  const row = normalizeProductMaterialRow(
    {
      id: "1",
      name: "Дъб",
      description: null,
      image_url: null,
      is_active: true,
      sort_order: 0,
      created_at: "",
      updated_at: "",
    },
    "group-material",
  );
  assert.equal(row.group_id, "group-material");
  assert.equal(row.display_size, "medium");
});

test("mixed display sizes resolve to largest for option group layout", () => {
  assert.equal(
    resolveOptionGroupVariantDisplaySize(["small", "medium", "large"]),
    "large",
  );
  assert.equal(resolveOptionGroupVariantDisplaySize(["small", null]), "small");
  assert.equal(resolveOptionGroupVariantDisplaySize([null, undefined]), "medium");
  assert.equal(resolveOptionGroupVariantDisplaySize([]), "medium");
});

test("storefront layout classes for small/medium/large", () => {
  assert.equal(
    variantDisplaySizeGridClass("medium"),
    "grid grid-cols-1 gap-2 sm:grid-cols-2",
  );
  assert.equal(
    variantDisplaySizeGridClass("small"),
    "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",
  );
  assert.equal(variantDisplaySizeGridClass("large"), "grid grid-cols-1 gap-3");
  assert.equal(normalizeVariantDisplaySize(undefined), DEFAULT_VARIANT_DISPLAY_SIZE);
});

test("legacy material-linked product stays medium and drives cards", () => {
  const materialId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const groups = mapProductOptionGroups(
    [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        name: "Вариант",
        key: "variant",
        input_type: "single",
        is_required: true,
        min_select: 1,
        max_select: 1,
        sort_order: 0,
        is_active: true,
        pricing_mode: "delta",
        depends_on_option_id: null,
        placeholder: null,
        max_length: null,
        text_price_delta: 0,
      },
    ],
    [
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        group_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        label: "Дъб",
        key: "dub",
        price_delta: 0,
        is_default: true,
        is_active: true,
        is_sold_out: false,
        material_id: materialId,
        sku: null,
        sort_order: 0,
      },
    ],
    new Map([
      [
        materialId,
        {
          id: materialId,
          name: "Дъб",
          description: null,
          image_url: "https://example.com/dub.webp",
        },
      ],
    ]),
  ) as ProductOptionGroup[];

  assert.equal(groups[0]!.values[0]!.material?.displaySize, "medium");
  assert.equal(
    shouldUseMaterialOptionCards(
      { fulfillmentType: "made_to_order", allowQuantitySelector: false },
      groups,
    ),
    true,
  );
  assert.equal(optionValueSupportsMaterialCard(groups[0]!.values[0]!), true);
});

test("non-material group variant maps with display_size small", () => {
  const variantId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const groups = mapProductOptionGroups(
    [
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        name: "Вид",
        key: "kit_type",
        input_type: "single",
        is_required: true,
        min_select: 1,
        max_select: 1,
        sort_order: 0,
        is_active: true,
        pricing_mode: "delta",
        depends_on_option_id: null,
        placeholder: null,
        max_length: null,
        text_price_delta: 0,
      },
    ],
    [
      {
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        group_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        label: "Мини",
        key: "mini",
        price_delta: 0,
        is_default: true,
        is_active: true,
        is_sold_out: false,
        material_id: variantId,
        sku: null,
        sort_order: 0,
      },
    ],
    new Map([
      [
        variantId,
        {
          id: variantId,
          name: "Мини комплект",
          description: "Компактен",
          image_url: "https://example.com/mini.webp",
          display_size: "small",
        },
      ],
    ]),
  ) as ProductOptionGroup[];

  assert.equal(groups[0]!.values[0]!.materialId, variantId);
  assert.equal(groups[0]!.values[0]!.material?.displaySize, "small");
  assert.equal(
    resolveOptionGroupVariantDisplaySize([
      groups[0]!.values[0]!.material?.displaySize,
    ]),
    "small",
  );
});

test("product editor and panel expose linked variant + groups UI", () => {
  const editor = readFileSync(
    resolve(root, "components/admin/product-option-groups-editor.tsx"),
    "utf8",
  );
  const panel = readFileSync(
    resolve(root, "components/admin/material-management-panel.tsx"),
    "utf8",
  );
  assert.match(editor, new RegExp(ADMIN_VARIANT_LINK_LABEL));
  assert.match(editor, /optgroup/);
  assert.match(panel, /Групи варианти/);
  assert.match(panel, /Размер на картата/);
  assert.match(panel, /createProductVariantGroup/);
});
