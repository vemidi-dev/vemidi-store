import assert from "node:assert/strict";
import test from "node:test";

import { siteConfig } from "@/config/site";
import {
  buildGoogleMerchantFeedItem,
  buildGoogleMerchantFeedXml,
  escapeXml,
  filterMerchantFeedProducts,
  formatMerchantPriceEur,
  isMerchantFeedEligibleProduct,
  mapMerchantAvailability,
  resolveAbsoluteUrl,
  resolveMerchantDescription,
  resolveMerchantProductId,
} from "@/lib/merchant/google-feed";
import type { ProductPublicationStatus } from "@/lib/product-publication";
import type { StorefrontCategory, StorefrontProduct } from "@/lib/storefront/types";

type FeedTestProduct = StorefrontProduct & {
  status?: ProductPublicationStatus | null;
};

function makeProduct(overrides: Partial<FeedTestProduct> = {}): FeedTestProduct {
  return {
    id: "uuid-1",
    slug: "demo-product",
    productCode: "VM-000001",
    title: "Demo Product",
    description: "Handcrafted demo product description.",
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

test("escapeXml escapes reserved characters", () => {
  assert.equal(
    escapeXml(`A & B <C> "D" 'E'`),
    "A &amp; B &lt;C&gt; &quot;D&quot; &apos;E&apos;",
  );
});

test("empty feed is valid RSS channel with Google namespace", () => {
  const xml = buildGoogleMerchantFeedXml({
    siteUrl: "https://shop.example.com",
    products: [],
  });

  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(
    xml,
    /<rss version="2\.0" xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0">/,
  );
  assert.match(xml, /<channel>/);
  assert.match(xml, /<title>/);
  assert.match(xml, /<\/channel><\/rss>$/);
  assert.doesNotMatch(xml, /<item>/);
});

test("product item contains required Google Merchant tags", () => {
  const xml = buildGoogleMerchantFeedXml({
    siteUrl: "https://shop.example.com",
    products: [makeProduct()],
    categories,
  });

  assert.match(xml, /<g:id>VM-000001<\/g:id>/);
  assert.match(xml, /<g:title>Demo Product<\/g:title>/);
  assert.match(
    xml,
    /<g:description>Handcrafted demo product description\.<\/g:description>/,
  );
  assert.match(
    xml,
    /<g:link>https:\/\/shop\.example\.com\/produkti\/demo-product<\/g:link>/,
  );
  assert.match(
    xml,
    /<g:image_link>https:\/\/cdn\.example\.com\/products\/demo\.jpg<\/g:image_link>/,
  );
  assert.match(xml, /<g:availability>in_stock<\/g:availability>/);
  assert.match(xml, /<g:price>19\.90 EUR<\/g:price>/);
  assert.match(xml, /<g:condition>new<\/g:condition>/);
  assert.match(
    xml,
    new RegExp(`<g:brand>${escapeXml(siteConfig.name)}<\\/g:brand>`),
  );
  assert.match(xml, /<g:mpn>VM-000001<\/g:mpn>/);
  assert.match(xml, /<g:identifier_exists>false<\/g:identifier_exists>/);
  assert.match(xml, /<g:product_type>Подаръци &gt; Кутии<\/g:product_type>/);
});

test("draft private and upsell-only products are excluded", () => {
  const products = [
    makeProduct({ id: "p-public", productCode: "VM-PUB" }),
    makeProduct({
      id: "p-draft",
      productCode: "VM-DRAFT",
      status: "draft",
    }),
    makeProduct({
      id: "p-upsell",
      productCode: "VM-UPSELL",
      visibility: "upsell_only",
    }),
    makeProduct({
      id: "p-archived",
      productCode: "VM-ARCH",
      status: "archived",
    }),
  ];

  const eligible = filterMerchantFeedProducts(products);
  assert.deepEqual(
    eligible.map((product) => product.productCode),
    ["VM-PUB"],
  );

  assert.equal(
    isMerchantFeedEligibleProduct({ status: "published", visibility: "public" }),
    true,
  );
  assert.equal(
    isMerchantFeedEligibleProduct({ status: "draft", visibility: "public" }),
    false,
  );
  assert.equal(
    isMerchantFeedEligibleProduct({
      status: "published",
      visibility: "upsell_only",
    }),
    false,
  );

  const xml = buildGoogleMerchantFeedXml({
    siteUrl: "https://shop.example.com",
    products,
  });
  assert.match(xml, /<g:id>VM-PUB<\/g:id>/);
  assert.doesNotMatch(xml, /VM-DRAFT|VM-UPSELL|VM-ARCH/);
});

test("image and link absolute URLs resolve against site URL", () => {
  const siteUrl = new URL("https://shop.example.com");
  assert.equal(
    resolveAbsoluteUrl("/assets/demo.jpg", siteUrl),
    "https://shop.example.com/assets/demo.jpg",
  );
  assert.equal(
    resolveAbsoluteUrl("https://cdn.example.com/a.jpg", siteUrl),
    "https://cdn.example.com/a.jpg",
  );
  assert.equal(
    resolveAbsoluteUrl("http://cdn.example.com/a.jpg", siteUrl),
    "http://cdn.example.com/a.jpg",
  );
  assert.equal(resolveAbsoluteUrl("  ", siteUrl), null);

  const item = buildGoogleMerchantFeedItem(
    makeProduct({
      images: [{ src: "/assets/local.jpg", alt: "Local" }],
    }),
    siteUrl,
  );
  assert.ok(item);
  assert.equal(item.imageLink, "https://shop.example.com/assets/local.jpg");
  assert.equal(item.link, "https://shop.example.com/produkti/demo-product");
});

test("resolveAbsoluteUrl rejects non-http protocols", () => {
  const siteUrl = new URL("https://shop.example.com");
  assert.equal(resolveAbsoluteUrl("javascript:alert(1)", siteUrl), null);
  assert.equal(
    resolveAbsoluteUrl("data:image/png;base64,abc", siteUrl),
    null,
  );
  assert.equal(resolveAbsoluteUrl("mailto:ops@example.com", siteUrl), null);
  assert.equal(resolveAbsoluteUrl("ftp://files.example.com/a.jpg", siteUrl), null);
  assert.equal(resolveAbsoluteUrl("file:///tmp/a.jpg", siteUrl), null);
});

test("products without images are skipped", () => {
  const xml = buildGoogleMerchantFeedXml({
    siteUrl: "https://shop.example.com",
    products: [
      makeProduct({
        productCode: "VM-NOIMG",
        images: [{ src: "", alt: "empty" }],
      }),
    ],
  });
  assert.doesNotMatch(xml, /<item>/);
  assert.doesNotMatch(xml, /VM-NOIMG/);
});

test("availability mapping covers stock made-to-order and out of stock", () => {
  assert.equal(
    mapMerchantAvailability({
      orderable: true,
      fulfillmentType: "stocked",
      soldOut: false,
    }),
    "in_stock",
  );
  assert.equal(
    mapMerchantAvailability({
      orderable: true,
      fulfillmentType: "made_to_order",
      soldOut: false,
    }),
    "in_stock",
  );
  assert.equal(
    mapMerchantAvailability({
      orderable: false,
      fulfillmentType: "stocked",
      soldOut: true,
    }),
    "out_of_stock",
  );
  assert.equal(
    mapMerchantAvailability({
      orderable: false,
      fulfillmentType: "unavailable",
      soldOut: false,
    }),
    "out_of_stock",
  );
});

test("price formatting uses EUR with two decimals", () => {
  assert.equal(formatMerchantPriceEur(19.9), "19.90 EUR");
  assert.equal(formatMerchantPriceEur(0), "0.00 EUR");
  assert.equal(formatMerchantPriceEur(Number.NaN), "0.00 EUR");
});

test("identifier_exists is always false and id prefers product code", () => {
  assert.equal(resolveMerchantProductId(makeProduct()), "VM-000001");
  assert.equal(
    resolveMerchantProductId(makeProduct({ productCode: "  ", id: "uuid-9" })),
    "uuid-9",
  );

  const item = buildGoogleMerchantFeedItem(
    makeProduct(),
    new URL("https://shop.example.com"),
  );
  assert.ok(item);
  assert.equal(item.identifierExists, false);
  assert.match(
    buildGoogleMerchantFeedXml({
      siteUrl: "https://shop.example.com",
      products: [makeProduct()],
    }),
    /<g:identifier_exists>false<\/g:identifier_exists>/,
  );
});

test("description prefers visible body and falls back when empty", () => {
  assert.equal(
    resolveMerchantDescription(makeProduct()),
    "Handcrafted demo product description.",
  );

  const fallback = resolveMerchantDescription(
    makeProduct({
      description: "  ",
      title: "Fallback Title",
    }),
  );
  assert.ok(fallback.length > 0);
  assert.match(fallback, /Fallback Title/);
});

test("additional images are included when present", () => {
  const xml = buildGoogleMerchantFeedXml({
    siteUrl: "https://shop.example.com",
    products: [
      makeProduct({
        images: [
          { src: "https://cdn.example.com/a.jpg", alt: "A" },
          { src: "https://cdn.example.com/b.jpg", alt: "B" },
        ],
      }),
    ],
  });
  assert.match(
    xml,
    /<g:image_link>https:\/\/cdn\.example\.com\/a\.jpg<\/g:image_link>/,
  );
  assert.match(
    xml,
    /<g:additional_image_link>https:\/\/cdn\.example\.com\/b\.jpg<\/g:additional_image_link>/,
  );
});

test("feed order is deterministic by merchant id", () => {
  const xml = buildGoogleMerchantFeedXml({
    siteUrl: "https://shop.example.com",
    products: [
      makeProduct({
        id: "2",
        productCode: "VM-000002",
        slug: "second",
        images: [{ src: "https://cdn.example.com/2.jpg", alt: "2" }],
      }),
      makeProduct({
        id: "1",
        productCode: "VM-000001",
        slug: "first",
        images: [{ src: "https://cdn.example.com/1.jpg", alt: "1" }],
      }),
    ],
  });

  const first = xml.indexOf("<g:id>VM-000001</g:id>");
  const second = xml.indexOf("<g:id>VM-000002</g:id>");
  assert.ok(first >= 0 && second >= 0);
  assert.ok(first < second);
});
