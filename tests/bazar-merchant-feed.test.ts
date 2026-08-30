import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BAZAR_MERCHANT_FACEBOOK_URL,
  BAZAR_MERCHANT_PICKUP_LINE,
  BAZAR_MERCHANT_SHIPPING_LINE,
  BAZAR_MERCHANT_STORE_LABEL,
  buildBazarMerchantFeedXml,
  renderBazarMerchantItemXml,
  resolveBazarMerchantDescription,
  stripHtmlPreserveParagraphs,
} from "@/lib/merchant/bazar-feed";
import { buildGoogleMerchantFeedXml } from "@/lib/merchant/google-feed";
import type { StorefrontCategory, StorefrontProduct } from "@/lib/storefront/types";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function makeProduct(
  overrides: Partial<StorefrontProduct> = {},
): StorefrontProduct {
  return {
    id: "uuid-1",
    slug: "demo-product",
    productCode: "VM-000001",
    title: "Demo Product",
    headingSubtitle: "H2 подзаглавие",
    subtitle: "Кратко резюме за продукта",
    description:
      "<p>Първи абзац с <strong>HTML</strong>.</p><p>Втори абзац.</p>",
    dimensionsMaterials: "Дърво, 15 см",
    price: 19.9,
    fulfillmentType: "stocked",
    availabilityLabel: "В наличност",
    orderable: true,
    images: [
      {
        src: "https://cdn.example.com/products/demo.jpg",
        alt: "Demo",
      },
    ],
    categorySlugs: ["kutii"],
    primaryCategoryId: "cat-1",
    updatedAt: null,
    createdAt: null,
    visibility: "public",
    ...overrides,
  };
}

const categories: StorefrontCategory[] = [
  {
    id: "cat-root",
    name: "Подаръци",
    slug: "podaraci",
    category_type: "product",
    parent_id: null,
    show_on_home: true,
    home_sort_order: 1,
    card_description: null,
    createdAt: null,
  },
  {
    id: "cat-1",
    name: "Кутии",
    slug: "kutii",
    category_type: "product",
    parent_id: "cat-root",
    show_on_home: true,
    home_sort_order: 2,
    card_description: null,
    createdAt: null,
  },
];

function extractTagValues(xml: string, tag: string): string[] {
  const pattern = new RegExp(`<g:${tag}>([\\s\\S]*?)<\\/g:${tag}>`, "g");
  return [...xml.matchAll(pattern)].map((match) => match[1] ?? "");
}

function extractDescriptions(xml: string): string[] {
  return extractTagValues(xml, "description");
}

function countItems(xml: string): number {
  return (xml.match(/<item>/g) ?? []).length;
}

function normalizeXmlTagSpacing(xml: string): string {
  return xml.replace(/>\s+</g, "><").trim();
}

test("bazar merchant route exists and returns XML response", () => {
  const routeSource = readFileSync(
    path.join(root, "app/api/merchant/bazar.xml/route.ts"),
    "utf8",
  );
  const googleRouteSource = readFileSync(
    path.join(root, "app/api/merchant/google.xml/route.ts"),
    "utf8",
  );

  assert.match(routeSource, /buildBazarMerchantFeedXml/);
  assert.match(routeSource, /BAZAR_MERCHANT_FEED_CONTENT_TYPE/);
  assert.doesNotMatch(googleRouteSource, /buildBazarMerchantFeedXml/);
});

test("stripHtmlPreserveParagraphs removes tags and keeps paragraph breaks", () => {
  const text = stripHtmlPreserveParagraphs(
    "<p>Един</p><p>Два</p><br/>Три",
  );
  assert.match(text, /Един/);
  assert.match(text, /Два/);
  assert.match(text, /Три/);
  assert.doesNotMatch(text, /<[^>]+>/);
});

test("resolveBazarMerchantDescription builds readable plain-text blocks", () => {
  const link = "https://shop.example.com/produkti/demo-product";
  const description = resolveBazarMerchantDescription(makeProduct(), link);

  assert.match(description, /^Кратко резюме за продукта\n\nДърво, 15 см/m);
  assert.doesNotMatch(description, /^Demo Product/m);
  assert.doesNotMatch(description, /Име:/);
  assert.doesNotMatch(description, /Подзаглавие:/);
  assert.doesNotMatch(description, /H2 подзаглавие/);
  assert.doesNotMatch(description, /Кратко резюме:/);
  assert.doesNotMatch(description, /Размери и материали:/);
  assert.doesNotMatch(description, /За продукта:/);
  assert.match(description, /Кратко резюме за продукта\n\nДърво, 15 см/);
  assert.match(description, /Дърво, 15 см\n\nПърви абзац с HTML \.\n\nВтори абзац\./);
  assert.match(
    description,
    /Разгледайте продукта тук: https:\/\/shop\.example\.com\/produkti\/demo-product\nFacebook: https:\/\/www\.facebook\.com\/profile\.php\?id=100090185474431\nМагазин: vemidi-crafts\.com\nИзпращаме с Еконт и Спиди до цялата страна\.\nИли вземете своята поръчка от място - Младост 2, София, след предварителна уговорка\./,
  );
  assert.ok(description.includes(`Facebook: ${BAZAR_MERCHANT_FACEBOOK_URL}`));
  assert.ok(description.includes(`Магазин: ${BAZAR_MERCHANT_STORE_LABEL}`));
  assert.ok(description.includes(BAZAR_MERCHANT_SHIPPING_LINE));
  assert.ok(description.includes(BAZAR_MERCHANT_PICKUP_LINE));
  assert.doesNotMatch(description, /<[^>]+>/);
  assert.doesNotMatch(description, /personalization|ordering_info|additional_info|meta_title|og_title/i);
});

test("resolveBazarMerchantDescription omits empty optional blocks", () => {
  const description = resolveBazarMerchantDescription(
    makeProduct({
      headingSubtitle: "  ",
      subtitle: null,
      dimensionsMaterials: undefined,
      description: "",
    }),
    "https://shop.example.com/produkti/demo-product",
  );

  assert.match(description, /^Разгледайте продукта тук: https:\/\/shop\.example\.com\/produkti\/demo-product/m);
  assert.doesNotMatch(description, /Име:/);
  assert.doesNotMatch(description, /Подзаглавие:/);
  assert.doesNotMatch(description, /Кратко резюме:/);
  assert.doesNotMatch(description, /Размери и материали:/);
  assert.doesNotMatch(description, /За продукта:/);
});

test("bazar item renders description as CDATA with readable new lines", () => {
  const item = {
    id: "VM-000001",
    title: "Demo Product",
    description: "Кратко резюме\n\nРазгледайте продукта тук: https://shop.example.com/p",
    link: "https://shop.example.com/p",
    imageLink: "https://cdn.example.com/p.jpg",
    additionalImageLinks: [],
    availability: "in_stock" as const,
    price: "19.90 EUR",
    condition: "new" as const,
    brand: "VeMiDi crafts",
    mpn: "VM-000001",
    identifierExists: false as const,
    productType: "Подаръци",
  };

  const xml = renderBazarMerchantItemXml(item);
  assert.match(
    xml,
    /<g:description><!\[CDATA\[Кратко резюме\n\nРазгледайте продукта тук: https:\/\/shop\.example\.com\/p/,
  );
});

test("bazar feed matches google feed ids and product types with same item count", () => {
  const input = {
    siteUrl: "https://shop.example.com",
    products: [
      makeProduct(),
      makeProduct({
        id: "uuid-2",
        productCode: "VM-000002",
        slug: "second-product",
        title: "Second Product",
        images: [{ src: "https://cdn.example.com/2.jpg", alt: "2" }],
      }),
      makeProduct({
        id: "uuid-3",
        productCode: "VM-NOIMG",
        images: [{ src: "", alt: "" }],
      }),
    ],
    categories,
  };

  const googleXml = buildGoogleMerchantFeedXml(input);
  const bazarXml = buildBazarMerchantFeedXml(input);

  assert.equal(countItems(googleXml), 2);
  assert.equal(countItems(bazarXml), 2);
  assert.deepEqual(extractTagValues(googleXml, "id"), extractTagValues(bazarXml, "id"));
  assert.deepEqual(
    extractTagValues(googleXml, "product_type"),
    extractTagValues(bazarXml, "product_type"),
  );
  assert.deepEqual(extractTagValues(googleXml, "title"), extractTagValues(bazarXml, "title"));
  assert.deepEqual(extractTagValues(googleXml, "link"), extractTagValues(bazarXml, "link"));
  assert.deepEqual(extractTagValues(googleXml, "price"), extractTagValues(bazarXml, "price"));
});

test("bazar feed only changes g:description compared with google feed", () => {
  const input = {
    siteUrl: "https://shop.example.com",
    products: [makeProduct()],
    categories,
  };

  const googleXml = buildGoogleMerchantFeedXml(input);
  const bazarXml = buildBazarMerchantFeedXml(input);

  const googleDescription = extractDescriptions(googleXml)[0] ?? "";
  const bazarDescription = extractDescriptions(bazarXml)[0] ?? "";

  assert.notEqual(googleDescription, bazarDescription);
  assert.doesNotMatch(bazarDescription, /Име:/);
  assert.doesNotMatch(bazarDescription, /За продукта:/);
  assert.ok(bazarDescription.includes(BAZAR_MERCHANT_FACEBOOK_URL));
  assert.ok(bazarDescription.includes(BAZAR_MERCHANT_STORE_LABEL));

  const stripItemDescriptions = (xml: string) =>
    [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)]
      .map((match) =>
        (match[0] ?? "").replace(/<g:description>[\s\S]*?<\/g:description>/g, ""),
      )
      .join("");

  assert.equal(
    normalizeXmlTagSpacing(stripItemDescriptions(googleXml)),
    normalizeXmlTagSpacing(stripItemDescriptions(bazarXml)),
  );
});

test("google merchant feed module remains unchanged for google route", () => {
  const googleFeedSource = readFileSync(
    path.join(root, "lib/merchant/google-feed.ts"),
    "utf8",
  );
  const googleRouteSource = readFileSync(
    path.join(root, "app/api/merchant/google.xml/route.ts"),
    "utf8",
  );

  assert.match(googleFeedSource, /buildGoogleMerchantFeedXml/);
  assert.match(googleFeedSource, /resolveMerchantDescription/);
  assert.doesNotMatch(googleFeedSource, /bazar|Bazar/);
  assert.match(googleRouteSource, /buildGoogleMerchantFeedXml/);
  assert.doesNotMatch(googleRouteSource, /bazar-feed/);
});
