import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { Product } from "@/lib/catalog";
import { buildProductPageMetadata } from "@/lib/seo/product-metadata";
import { resolveProductPageSeo } from "@/lib/seo/product-page-seo";
import { selectPrimaryActiveLandingPage } from "@/lib/product-landing/repository";
import {
  getProductLandingCtaAnchorProps,
  PRODUCT_LANDING_CTA_LABEL,
  resolveProductLandingCta,
} from "@/lib/product-landing/storefront-cta";
import type { ProductLandingPage, ProductLandingPageRow } from "@/lib/product-landing/types";
import { buildProductLandingUrl, getLandingBaseUrl } from "@/lib/product-landing/url";
import { getProductPath } from "@/lib/product-url";
import { getSiteUrl } from "@/lib/site-url";
import type { StorefrontCatalog } from "@/lib/storefront/types";

const productId = "11111111-1111-4111-8111-111111111111";
const landingBaseUrl = getLandingBaseUrl();

const activePrimaryLanding: ProductLandingPage = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01",
  productId,
  title: "Вълшебни пеперуди",
  slug: "valshebni-peperudi",
  campaignCode: "butterflies",
  isPrimary: true,
  isActive: true,
  sortOrder: 0,
};

const product: Product = {
  id: productId,
  slug: "peperuda",
  productCode: "VM-000010",
  title: "Пеперуда",
  description: "Описание на продукта.",
  price: 19.5,
  fulfillmentType: "made_to_order",
  availabilityLabel: "По поръчка",
  orderable: true,
  images: [{ src: "/img.jpg", alt: "Пеперуда" }],
};

const catalog: StorefrontCatalog = {
  categories: [
    {
      id: "cat-1",
      name: "Комплекти",
      slug: "komplekti",
      category_type: "product",
      parent_id: null,
      show_on_home: true,
      home_sort_order: 1,
      card_description: null,
      createdAt: null,
    },
  ],
  products: [
    {
      id: product.id,
      slug: product.slug,
      productCode: product.productCode,
      title: product.title,
      description: product.description,
      price: product.price,
      fulfillmentType: product.fulfillmentType,
      availabilityLabel: product.availabilityLabel,
      orderable: product.orderable,
      images: product.images,
      categorySlugs: ["komplekti"],
      primaryCategoryId: "cat-1",
      updatedAt: null,
      createdAt: null,
    },
  ],
  featuredProductIds: [],
  relatedProductIdsByProductId: new Map(),
};

function makeLandingRow(
  overrides: Partial<ProductLandingPageRow> & Pick<ProductLandingPageRow, "id" | "slug">,
): ProductLandingPageRow {
  return {
    product_id: productId,
    title: "Landing title",
    campaign_code: "butterflies",
    is_primary: true,
    is_active: true,
    sort_order: 0,
    ...overrides,
  };
}

test("resolveProductLandingCta returns CTA for active primary landing", () => {
  const cta = resolveProductLandingCta(activePrimaryLanding, landingBaseUrl);
  assert.ok(cta);
  assert.equal(cta.label, PRODUCT_LANDING_CTA_LABEL);
  assert.equal(
    cta.href,
    "https://special.vemidi-crafts.com/valshebni-peperudi?source=store",
  );
});

test("resolveProductLandingCta builds URL only from trusted base URL and validated slug", () => {
  assert.equal(
    buildProductLandingUrl("valshebni-peperudi", landingBaseUrl),
    "https://special.vemidi-crafts.com/valshebni-peperudi",
  );
  assert.equal(resolveProductLandingCta(null, landingBaseUrl), null);
  assert.equal(
    resolveProductLandingCta(
      { ...activePrimaryLanding, slug: "../admin" },
      landingBaseUrl,
    ),
    null,
  );
});

test("resolveProductLandingCta is hidden without landing", () => {
  assert.equal(resolveProductLandingCta(null), null);
});

test("inactive primary landing is not used for CTA", () => {
  const rows = [
    makeLandingRow({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01",
      slug: "inactive-primary",
      is_primary: true,
      is_active: false,
    }),
  ];

  assert.equal(selectPrimaryActiveLandingPage(rows, productId), null);
  assert.equal(
    resolveProductLandingCta({
      ...activePrimaryLanding,
      isActive: false,
    }),
    null,
  );
});

test("non-primary landing is not used for CTA", () => {
  const rows = [
    makeLandingRow({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02",
      slug: "secondary-landing",
      is_primary: false,
      is_active: true,
    }),
  ];

  assert.equal(selectPrimaryActiveLandingPage(rows, productId), null);
  assert.equal(
    resolveProductLandingCta({
      ...activePrimaryLanding,
      isPrimary: false,
    }),
    null,
  );
});

test("repository selection tolerates query failures by returning null", async () => {
  const supabase = {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        order() {
          return this;
        },
        limit() {
          return this;
        },
        maybeSingle: async () => ({
          data: null,
          error: { message: "connection failed", code: "08006" },
        }),
      };
    },
  };

  const { getPrimaryActiveProductLandingPage } = await import(
    "@/lib/product-landing/repository"
  );

  assert.equal(
    await getPrimaryActiveProductLandingPage(supabase as never, productId),
    null,
  );
});

test("landing CTA anchor opens in a new tab with source=store", () => {
  const cta = resolveProductLandingCta(activePrimaryLanding, landingBaseUrl);
  assert.ok(cta);
  const props = getProductLandingCtaAnchorProps(cta);
  assert.equal(props.href, cta.href);
  assert.equal(props.target, "_blank");
  assert.equal(props.rel, "noopener noreferrer");
  assert.match(props.href, /[?&]source=store(?:&|$)/);
});

test("product page SEO metadata and breadcrumbs stay on canonical product URL", () => {
  const metadata = buildProductPageMetadata(product, product.slug, {
    primaryCategory: { name: "Комплекти", slug: "komplekti" },
  });
  const seo = resolveProductPageSeo(catalog, catalog.products[0]);
  const canonicalUrl = new URL(getProductPath(product.slug), getSiteUrl()).toString();

  assert.equal(metadata.alternates?.canonical, canonicalUrl);
  assert.equal(
    seo.breadcrumbItems.at(-1)?.path,
    getProductPath(product.slug),
  );
  assert.doesNotMatch(JSON.stringify(metadata), /special\.vemidi-crafts\.com/i);
  assert.doesNotMatch(
    JSON.stringify(seo.breadcrumbItems),
    /special\.vemidi-crafts\.com/i,
  );
});

test("product landing CTA component opens landing in a new tab", () => {
  const componentSource = readFileSync(
    new URL("../components/product/product-landing-page-cta.tsx", import.meta.url),
    "utf8",
  );
  const ctaSource = readFileSync(
    new URL("../lib/product-landing/storefront-cta.ts", import.meta.url),
    "utf8",
  );

  assert.match(componentSource, /getProductLandingCtaAnchorProps/);
  assert.doesNotMatch(componentSource, /ProductLandingHandoffButton/);
  assert.doesNotMatch(componentSource, /campaign-landing-handoff/);
  assert.match(ctaSource, /target: "_blank"/);
  assert.match(ctaSource, /source", PRODUCT_LANDING_CTA_SOURCE_PARAM/);
});
