import assert from "node:assert/strict";
import test from "node:test";

import type { Product } from "@/lib/catalog";
import {
  buildProductMetaDescription,
  buildProductSchemaDescription,
} from "@/lib/seo/product-description-seo";
import { normalizeSeoPlainText } from "@/lib/seo/seo-text";

const baseProduct: Product = {
  id: "prod-1",
  slug: "plik-za-pari",
  productCode: "VM-000001",
  title: "Плик за пари",
  description:
    "Дървен плик за пари\r\nс персонален надпис и избор на цвят. Подходящ за сватба, кръщене и рожден ден. Изработка 5–10 работни дни.",
  price: 24.9,
  fulfillmentType: "made_to_order",
  availabilityLabel: "По поръчка",
  orderable: true,
  customizable: true,
  hasPersonalizationOptions: true,
  images: [],
};

test("product meta description removes literal and real newlines", () => {
  const description = buildProductMetaDescription(baseProduct);
  assert.ok(description);
  assert.ok(!description.includes("\\r"));
  assert.ok(!description.includes("\\n"));
  assert.ok(!description.includes("\r"));
  assert.ok(!description.includes("\n"));
});

test("thin descriptions get unique deterministic fallback from real fields", () => {
  const thin: Product = {
    ...baseProduct,
    slug: "plik-za-pari-za-momicheta",
    title: "Плик за пари за момичета",
    description: "Кратко описание за момичета.",
    fulfillmentNote: "Изработка 5–10 работни дни",
  };
  const other: Product = {
    ...thin,
    slug: "tvorcheski-komplekt-valshebni-peperudi",
    title: "Творчески комплект „Вълшебни пеперуди“",
    description: "Комплект за деца.",
    customizable: false,
    hasPersonalizationOptions: false,
    fulfillmentNote: null,
  };

  const thinMeta = buildProductMetaDescription(thin, {
    primaryCategory: { name: "Пликове за пари", slug: "plik-za-pari" },
  });
  const otherMeta = buildProductMetaDescription(other, {
    primaryCategory: { name: "Творчески комплекти", slug: "tvorcheski-komplekti" },
  });

  assert.ok(thinMeta);
  assert.ok(otherMeta);
  assert.notEqual(thinMeta, otherMeta);
  assert.ok(thinMeta.includes("Плик за пари за момичета"));
  assert.ok(thinMeta.includes("Пликове за пари"));
  assert.ok(otherMeta.includes("Творчески комплект"));
});

test("schema description matches normalized meta source semantics", () => {
  const meta = buildProductMetaDescription(baseProduct, {
    primaryCategory: { name: "Пликове за пари", slug: "plik-za-pari" },
  });
  const schema = buildProductSchemaDescription(baseProduct, {
    primaryCategory: { name: "Пликове за пари", slug: "plik-za-pari" },
  });

  assert.ok(meta);
  assert.ok(schema.startsWith(normalizeSeoPlainText(baseProduct.description).slice(0, 40)));
  assert.ok(!schema.includes("\r\n"));
});

test("empty description fallback never returns whitespace-only text", () => {
  const empty: Product = {
    ...baseProduct,
    description: "   \\r\\n   ",
    customizable: false,
    hasPersonalizationOptions: false,
    hasColorOptions: false,
    fulfillmentNote: null,
    cardBadge: null,
  };

  const meta = buildProductMetaDescription(empty);
  assert.ok(meta);
  assert.ok(meta.trim().length > 0);
});
