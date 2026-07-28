import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  productHasMaterialOptionValues,
  shouldUseMaterialOptionCards,
} from "@/lib/product-option-layout";
import type { ProductOptionGroup } from "@/lib/product-options";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const materialGroups: ProductOptionGroup[] = [
  {
    id: "g1",
    name: "Материал",
    key: "material",
    inputType: "single",
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    sortOrder: 0,
    isActive: true,
    pricingMode: "delta",
    dependsOnOptionId: null,
    placeholder: null,
    maxLength: null,
    textPriceDelta: 0,
    values: [
      {
        id: "v1",
        label: "Бреза",
        key: "birch",
        priceDelta: 0.65,
        isDefault: true,
        isActive: true,
        isSoldOut: false,
        imageUrl: null,
        sortOrder: 0,
        material: {
          id: "m1",
          name: "Брезов шперплат",
          description: null,
          imageUrl: null,
        },
      },
    ],
  },
];

const plainGroups: ProductOptionGroup[] = [
  {
    ...materialGroups[0]!,
    values: [
      {
        id: "v1",
        label: "Стандарт",
        key: "standard",
        priceDelta: 0,
        isDefault: true,
        isActive: true,
        isSoldOut: false,
        imageUrl: null,
        sortOrder: 0,
      },
    ],
  },
];

test("material-stock layout helper enables cards for stocked or material-linked options", () => {
  assert.equal(
    shouldUseMaterialOptionCards(
      { fulfillmentType: "stocked", allowQuantitySelector: true },
      plainGroups,
    ),
    true,
  );
  assert.equal(
    shouldUseMaterialOptionCards(
      { fulfillmentType: "made_to_order", allowQuantitySelector: false },
      plainGroups,
    ),
    false,
  );
  assert.equal(
    shouldUseMaterialOptionCards(
      { fulfillmentType: "made_to_order", allowQuantitySelector: false },
      materialGroups,
    ),
    true,
  );
  assert.equal(productHasMaterialOptionValues(materialGroups), true);
  assert.equal(productHasMaterialOptionValues(plainGroups), false);
});

test("product detail add-to-cart keeps material order: qty → tiers → personalization", () => {
  const source = readSource("../components/product/product-detail-add-to-cart.tsx");

  assert.match(source, /Отстъпки за количества/);
  assert.match(
    source,
    /Цените се обновяват според избрания размер, материал и персонализация/,
  );
  assert.match(source, /Персонализация/);
  assert.match(source, /resolveQuantityTierDisplayUnitPrice/);

  assert.match(source, /quantitySelectorOrder = useMaterialCards \? "order-20"/);
  assert.match(source, /quantityTiersSectionOrder = "order-30"/);
  assert.match(source, /personalizationSectionOrder[\s\S]*?"order-40"/);

  const tiersHeading = source.indexOf("Отстъпки за количества");
  const personalizationHeading = source.indexOf(
    "Персонализация",
    tiersHeading,
  );
  assert.ok(tiersHeading > -1);
  assert.ok(personalizationHeading > tiersHeading);
});

test("product page copy defaults use stock label Цена за този продукт", () => {
  const siteContent = readSource("../lib/content/site-content.ts");
  const addToCart = readSource("../components/product/product-detail-add-to-cart.tsx");

  assert.match(siteContent, /"product\.price_summary_label_stock": "Цена за този продукт"/);
  assert.match(addToCart, /priceSummaryLabel=\{priceSummaryLabel\}/);
});

test("left colors slot is only in material-stock layout branch", () => {
  const view = readSource("../components/product/product-detail-view.tsx");
  const addToCart = readSource("../components/product/product-detail-add-to-cart.tsx");

  assert.match(view, /PRODUCT_LEFT_COLORS_SLOT_ID/);
  assert.match(addToCart, /useMaterialCards && leftColorsSlot && colorFieldsSection/);

  const materialBranch = view.indexOf("usesMaterialStockLayout ?");
  const leftSlot = view.indexOf("PRODUCT_LEFT_COLORS_SLOT_ID", materialBranch);
  const nonMaterialBranch = view.indexOf(") : (", materialBranch);
  assert.ok(materialBranch > -1);
  assert.ok(leftSlot > materialBranch);
  assert.ok(leftSlot < nonMaterialBranch || nonMaterialBranch === -1);
});

test("related products section uses neutral copy and category link placement", () => {
  const view = readSource("../components/product/product-detail-view.tsx");

  assert.match(view, /Може да харесате/);
  assert.match(view, /Вижте още продукти/);
  assert.match(view, /Вижте всички продукти/);
  assert.match(
    view,
    /Подбрахме още идеи, които се комбинират добре с този продукт/,
  );

  const relatedSection = view.indexOf("relatedProducts.length");
  const categoryInRelated = view.indexOf(
    "showCategoryLink && primaryCategory",
    relatedSection,
  );
  assert.ok(relatedSection > -1);
  assert.ok(categoryInRelated > relatedSection);

  // Category link should not sit immediately under subtitle in configurator zone.
  const firstCategoryLink = view.indexOf("showCategoryLink && primaryCategory");
  assert.equal(firstCategoryLink, categoryInRelated);
});

test("ready product CTA renders only when configured", () => {
  const view = readSource("../components/product/product-detail-view.tsx");

  assert.match(
    view,
    /featuredRelatedProduct && readyProductCtaLabel \?/,
  );
  assert.match(view, /readyProductCtaLabel/);
});
