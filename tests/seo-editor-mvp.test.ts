import assert from "node:assert/strict";
import test from "node:test";

import { siteConfig } from "@/config/site";
import {
  buildCategorySeoOverviewRow,
  buildProductSeoOverviewRow,
  formatRobotsIndexDisplay,
  hasSeoText,
  resolveSeoCompleteness,
  seoTextLength,
  summarizeSeoOverview,
} from "@/lib/admin/seo-overview";
import {
  buildDocumentTitlePreview,
  resolveCategorySeoPreview,
  resolveProductSeoPreview,
} from "@/lib/admin/seo-resolved-preview";
import { getAdminTab } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import { makeAdminTabHref, normalizeAdminTab } from "@/lib/admin/params";

test("hasSeoText treats blank and whitespace as missing", () => {
  assert.equal(hasSeoText(null), false);
  assert.equal(hasSeoText(undefined), false);
  assert.equal(hasSeoText(""), false);
  assert.equal(hasSeoText("   "), false);
  assert.equal(hasSeoText("SEO title"), true);
});

test("seo overview completeness and meta description length", () => {
  assert.equal(
    resolveSeoCompleteness({
      metaTitlePresent: false,
      metaDescriptionPresent: false,
      ogTitlePresent: false,
      ogDescriptionPresent: false,
    }),
    "missing",
  );
  assert.equal(
    resolveSeoCompleteness({
      metaTitlePresent: true,
      metaDescriptionPresent: false,
      ogTitlePresent: false,
      ogDescriptionPresent: false,
    }),
    "partial",
  );
  assert.equal(
    resolveSeoCompleteness({
      metaTitlePresent: true,
      metaDescriptionPresent: true,
      ogTitlePresent: true,
      ogDescriptionPresent: true,
    }),
    "complete",
  );

  const productRow = buildProductSeoOverviewRow({
    id: "p1",
    name: "Кутия",
    slug: "kutiya",
    meta_title: "SEO кутия",
    meta_description: "  Кратко описание  ",
    og_title: null,
    og_description: "",
  });
  assert.equal(productRow.metaTitlePresent, true);
  assert.equal(productRow.metaDescriptionPresent, true);
  assert.equal(productRow.metaDescriptionLength, seoTextLength("  Кратко описание  "));
  assert.equal(productRow.ogTitlePresent, false);
  assert.equal(productRow.ogDescriptionPresent, false);
  assert.equal(productRow.completeness, "partial");
  assert.equal(productRow.robotsIndexLabel, null);
  assert.ok(productRow.editHref.includes("editProduct=p1"));
});

test("categories robots_index display and overview row", () => {
  assert.equal(formatRobotsIndexDisplay(null), "Автоматично");
  assert.equal(formatRobotsIndexDisplay(undefined), "Автоматично");
  assert.equal(formatRobotsIndexDisplay(true), "Индексирай");
  assert.equal(formatRobotsIndexDisplay(false), "Не индексирай");

  const occasionRow = buildCategorySeoOverviewRow({
    id: "c1",
    name: "Сватба",
    slug: "svatba",
    category_type: "occasion",
    meta_title: null,
    meta_description: null,
    og_title: null,
    og_description: null,
    robots_index: false,
  });
  assert.equal(occasionRow.kind, "occasion");
  assert.equal(occasionRow.robotsIndexLabel, "Не индексирай");
  assert.equal(occasionRow.completeness, "missing");
  assert.ok(occasionRow.editHref.includes("tab=categories"));
  assert.ok(occasionRow.editHref.includes("categoryType=occasion"));
  assert.ok(occasionRow.editHref.includes("#category-edit-c1"));

  const productCategoryRow = buildCategorySeoOverviewRow({
    id: "c2",
    name: "Кутии",
    slug: "kutii",
    category_type: "product",
    meta_title: "A",
    meta_description: "B",
    og_title: "C",
    og_description: "D",
    robots_index: true,
  });
  assert.equal(productCategoryRow.kind, "category");
  assert.equal(productCategoryRow.robotsIndexLabel, "Индексирай");
  assert.equal(productCategoryRow.completeness, "complete");

  const summary = summarizeSeoOverview([productRowFixture(), occasionRow]);
  assert.equal(summary.total, 2);
  assert.equal(summary.missing, 1);
  assert.equal(summary.partial, 1);
});

function productRowFixture() {
  return buildProductSeoOverviewRow({
    id: "p2",
    name: "Рамка",
    slug: "ramka",
    meta_title: "Title",
    meta_description: null,
    og_title: null,
    og_description: null,
  });
}

test("resolved product preview uses storefront fallbacks when meta is empty", () => {
  const preview = resolveProductSeoPreview({
    name: "Персонализирана кутия",
    description: "Кратко.",
    meta_title: "",
    meta_description: null,
    og_title: "  ",
    og_description: undefined,
    primaryCategory: { name: "Кутии", slug: "kutii" },
  });

  assert.equal(preview.metaTitle, "Персонализирана кутия");
  assert.ok(preview.metaDescription.length > 0);
  assert.match(preview.metaDescription, /Персонализирана кутия/);
  assert.equal(preview.ogTitle, preview.metaTitle);
  assert.equal(preview.ogDescription, preview.metaDescription);
  assert.equal(preview.documentTitleNote, `| ${siteConfig.name}`);
  assert.equal(
    preview.documentTitlePreview,
    `${preview.metaTitle} | ${siteConfig.name}`,
  );
});

test("resolved product preview prefers explicit admin meta and OG", () => {
  const preview = resolveProductSeoPreview({
    name: "Продукт",
    description: "Дълго описание на продукта за fallback.",
    meta_title: "Admin SEO title",
    meta_description: "Admin meta description for search results.",
    og_title: "Admin OG title",
    og_description: "Admin OG description for sharing.",
  });

  assert.equal(preview.metaTitle, "Admin SEO title");
  assert.equal(preview.metaDescription, "Admin meta description for search results.");
  assert.equal(preview.ogTitle, "Admin OG title");
  assert.equal(preview.ogDescription, "Admin OG description for sharing.");
});

test("resolved category/occasion preview keeps empty-meta fallbacks", () => {
  const categoryPreview = resolveCategorySeoPreview({
    name: "Кутии",
    category_type: "product",
    card_description: null,
    meta_title: null,
    meta_description: "",
    og_title: null,
    og_description: null,
  });
  assert.equal(categoryPreview.metaTitle, "Кутии");
  assert.ok(categoryPreview.metaDescription.includes("Кутии"));
  assert.equal(categoryPreview.ogTitle, "Кутии");
  assert.equal(categoryPreview.ogDescription, categoryPreview.metaDescription);

  const occasionPreview = resolveCategorySeoPreview({
    name: "Кръщене",
    category_type: "occasion",
    meta_title: "  ",
    meta_description: null,
  });
  assert.equal(occasionPreview.metaTitle, "Кръщене");
  assert.ok(occasionPreview.metaDescription.includes("Кръщене"));
});

test("document title preview matches layout template note", () => {
  const built = buildDocumentTitlePreview("Тест");
  assert.equal(built.documentTitleNote, `| ${siteConfig.name}`);
  assert.equal(built.documentTitlePreview, `Тест | ${siteConfig.name}`);
});

test("admin seo tab is recognized in tab helpers", () => {
  assert.equal(normalizeAdminTab("seo"), "seo");
  const formData = new FormData();
  formData.set(adminFormFields.common.tab, "seo");
  assert.equal(getAdminTab(formData, "products"), "seo");
});

test("bare admin tab defaults to orders to avoid products loadAdminData timeout", () => {
  assert.equal(normalizeAdminTab(""), "orders");
  assert.equal(normalizeAdminTab("unknown-tab"), "orders");
  assert.equal(normalizeAdminTab("products"), "products");
  assert.equal(normalizeAdminTab("orders"), "orders");
  assert.equal(makeAdminTabHref("products"), "/admin?tab=products");
  assert.equal(makeAdminTabHref("orders"), "/admin?tab=orders");
});
