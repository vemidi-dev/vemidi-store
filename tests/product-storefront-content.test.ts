import assert from "node:assert/strict";
import test from "node:test";

import type { Product } from "@/lib/catalog";
import {
  buildProductMetaDescription,
  buildProductSchemaDescription,
} from "@/lib/seo/product-description-seo";
import { buildProductPageMetadata } from "@/lib/seo/product-metadata";
import {
  resolveAdminProductMetaDescription,
  resolveProductMetaTitle,
  resolveProductOgDescription,
  resolveProductOgTitle,
} from "@/lib/seo/product-page-content";

const baseProduct: Product = {
  id: "prod-1",
  slug: "plik-za-pari",
  productCode: "VM-000001",
  title: "Плик за пари",
  description: "Кратко описание без достатъчна дължина.",
  price: 24.9,
  fulfillmentType: "made_to_order",
  availabilityLabel: "По поръчка",
  orderable: true,
  images: [{ src: "https://cdn.example.com/plik.jpg", alt: "Плик" }],
};

test("product meta title prefers admin field over product title", () => {
  const product = {
    ...baseProduct,
    meta_title: "SEO плик | VeMiDi",
  };

  assert.equal(resolveProductMetaTitle(product), "SEO плик | VeMiDi");
});

test("product meta description prefers admin field over composed fallback", () => {
  const product = {
    ...baseProduct,
    meta_description: "Admin meta описание за продукта.",
  };

  assert.equal(
    buildProductMetaDescription(product),
    "Admin meta описание за продукта.",
  );
  assert.equal(
    resolveAdminProductMetaDescription(product),
    "Admin meta описание за продукта.",
  );
});

test("product OG fields fall back to meta title and description", () => {
  const product = {
    ...baseProduct,
    meta_title: "Meta title",
    meta_description: "Meta description",
  };
  const metaTitle = resolveProductMetaTitle(product);
  const metaDescription = buildProductMetaDescription(product);

  assert.equal(resolveProductOgTitle(product, metaTitle), "Meta title");
  assert.equal(
    resolveProductOgDescription(product, metaDescription),
    "Meta description",
  );
});

test("product page metadata uses admin SEO fields for title and OG", () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://vemidi-crafts.com";

  try {
    const product = {
      ...baseProduct,
      meta_title: "SEO плик",
      meta_description: "Admin описание за търсачките.",
      og_title: "OG плик",
      og_description: "OG описание за споделяне.",
    };

    const metadata = buildProductPageMetadata(product, product.slug, {
      primaryCategory: { name: "Пликове", slug: "plikove" },
    });

    assert.equal(metadata.title, "SEO плик");
    assert.equal(metadata.description, "Admin описание за търсачките.");
    assert.equal(metadata.openGraph?.title, "OG плик");
    assert.equal(metadata.openGraph?.description, "OG описание за споделяне.");
    assert.equal(metadata.twitter?.title, "OG плик");
  } finally {
    if (previousSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
  }
});

test("product schema description keeps legacy behavior when admin meta is empty", () => {
  const longDescription = `${"Дълго описание. ".repeat(12)}Край.`;
  const product = {
    ...baseProduct,
    description: longDescription,
  };

  const schema = buildProductSchemaDescription(product);
  assert.ok(schema.length >= 120);
});

test("legacy product metadata fallback remains when admin fields are empty", () => {
  const metadata = buildProductPageMetadata(baseProduct, baseProduct.slug);

  assert.equal(metadata.title, baseProduct.title);
  assert.ok(metadata.description && metadata.description.length > 0);
  assert.equal(metadata.openGraph?.title, baseProduct.title);
});
