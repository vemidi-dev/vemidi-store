import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCategoryMetaDescription,
  buildOccasionMetaDescription,
} from "@/lib/seo/category-description-seo";
import { buildCategoryPageMetadata } from "@/lib/seo/category-metadata";
import {
  resolveCategoryHeroDescription,
  resolveCategoryIntroText,
  resolveCategoryListingHeading,
  resolveCategoryMetaTitle,
  resolveCategoryOgDescription,
  resolveCategoryOgTitle,
  resolveCategoryPageRobots,
  resolveCategorySeoBody,
} from "@/lib/seo/category-page-content";
import { buildOccasionPageMetadata } from "@/lib/seo/occasion-metadata";
import type { StorefrontCategory } from "@/lib/storefront/types";

const baseCategory: StorefrontCategory = {
  id: "cat-1",
  name: "Бижута",
  slug: "bijuta",
  category_type: "product",
  parent_id: null,
  show_on_home: true,
  home_sort_order: 1,
  card_description: "Кратко card описание.",
  createdAt: null,
};

const baseOccasion: StorefrontCategory = {
  id: "occ-1",
  name: "Сватба",
  slug: "svatba",
  category_type: "occasion",
  parent_id: null,
  show_on_home: true,
  home_sort_order: 1,
  card_description: "Подаръци за сватбен ден.",
  createdAt: null,
};

test("hero description prefers admin field over card_description", () => {
  const category = {
    ...baseCategory,
    hero_description: "Hero от admin",
    card_description: "Card fallback",
  };

  assert.equal(
    resolveCategoryHeroDescription(category, "Generic fallback"),
    "Hero от admin",
  );
});

test("hero description falls back to card_description then template", () => {
  assert.equal(
    resolveCategoryHeroDescription(baseCategory, "Generic fallback"),
    "Кратко card описание.",
  );
  assert.equal(
    resolveCategoryHeroDescription(
      { ...baseCategory, card_description: null },
      "Generic fallback",
    ),
    "Generic fallback",
  );
});

test("listing heading and intro or seo body use admin values when set", () => {
  const category = {
    ...baseCategory,
    listing_heading: "Всички бижута",
    intro_text: "Ред един\nРед две",
    seo_body: "Дълъг SEO блок",
  };

  assert.equal(resolveCategoryListingHeading(category), "Всички бижута");
  assert.equal(resolveCategoryIntroText(category), "Ред един\nРед две");
  assert.equal(resolveCategorySeoBody(category), "Дълъг SEO блок");
});

test("intro and seo body stay hidden when admin fields are empty", () => {
  assert.equal(resolveCategoryIntroText(baseCategory), null);
  assert.equal(resolveCategorySeoBody(baseCategory), null);
  assert.equal(
    resolveCategoryIntroText({ ...baseCategory, intro_text: "   " }),
    null,
  );
});

test("listing heading falls back to category name", () => {
  assert.equal(resolveCategoryListingHeading(baseCategory), "Бижута");
});

test("meta title and description prefer admin-managed values", () => {
  const category = {
    ...baseCategory,
    meta_title: "SEO заглавие | VeMiDi",
    meta_description: "Admin meta описание за категорията.",
    og_title: "OG заглавие",
    og_description: "OG описание",
  };

  assert.equal(resolveCategoryMetaTitle(category), "SEO заглавие | VeMiDi");
  assert.equal(
    buildCategoryMetaDescription(category),
    "Admin meta описание за категорията.",
  );
  assert.equal(
    resolveCategoryOgTitle(category, resolveCategoryMetaTitle(category)),
    "OG заглавие",
  );
  assert.equal(
    resolveCategoryOgDescription(
      category,
      buildCategoryMetaDescription(category),
    ),
    "OG описание",
  );
});

test("og fields fall back to meta title and description", () => {
  const category = {
    ...baseCategory,
    meta_title: "Meta title",
    meta_description: "Meta description",
  };

  assert.equal(
    resolveCategoryOgTitle(category, resolveCategoryMetaTitle(category)),
    "Meta title",
  );
  assert.equal(
    resolveCategoryOgDescription(
      category,
      buildCategoryMetaDescription(category),
    ),
    "Meta description",
  );
});

test("robots_index overrides default indexability when not faceted", () => {
  assert.deepEqual(
    resolveCategoryPageRobots({
      faceted: false,
      indexable: false,
      robotsIndex: true,
    }),
    { index: true, follow: true },
  );
  assert.deepEqual(
    resolveCategoryPageRobots({
      faceted: false,
      indexable: true,
      robotsIndex: false,
    }),
    { index: false, follow: true },
  );
  assert.deepEqual(
    resolveCategoryPageRobots({
      faceted: false,
      indexable: true,
      robotsIndex: null,
    }),
    { index: true, follow: true },
  );
});

test("faceted pages stay noindex regardless of robots_index", () => {
  assert.deepEqual(
    resolveCategoryPageRobots({
      faceted: true,
      indexable: true,
      robotsIndex: true,
    }),
    { index: false, follow: true },
  );
});

test("category page metadata uses admin SEO fields", () => {
  const category = {
    ...baseCategory,
    meta_title: "Категория SEO",
    meta_description: "Описание за търсачките.",
    og_title: "OG категория",
    og_description: "OG описание",
    robots_index: false,
  };

  const metadata = buildCategoryPageMetadata({
    category,
    categories: [category],
    productCategorySlugs: [["bijuta"]],
    parent: null,
  });

  assert.equal(metadata.title, "Категория SEO");
  assert.equal(metadata.description, "Описание за търсачките.");
  assert.equal(metadata.openGraph?.title, "OG категория");
  assert.equal(metadata.openGraph?.description, "OG описание");
  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.equal(metadata.alternates?.canonical, "/categorii/bijuta");
});

test("occasion page metadata uses the same admin content fields", () => {
  const occasion = {
    ...baseOccasion,
    hero_description: "Hero за сватба",
    listing_heading: "Подаръци за сватба",
    meta_title: "Сватба | VeMiDi",
    meta_description: "Персонализирани сватбени подаръци.",
    robots_index: true,
  };

  const metadata = buildOccasionPageMetadata({
    occasion,
    categories: [occasion],
    productCategorySlugs: [["svatba"]],
  });

  assert.equal(metadata.title, "Сватба | VeMiDi");
  assert.equal(metadata.description, "Персонализирани сватбени подаръци.");
  assert.deepEqual(metadata.robots, { index: true, follow: true });
  assert.equal(metadata.alternates?.canonical, "/povodi/svatba");
});

test("occasion meta description keeps legacy fallback when admin field is empty", () => {
  assert.equal(
    buildOccasionMetaDescription(baseOccasion),
    "Подаръци за сватбен ден.",
  );
  const fallback = buildOccasionMetaDescription({
    ...baseOccasion,
    card_description: null,
  });

  assert.match(fallback, /Открийте персонализирани подаръци за „Сватба/);
  assert.match(fallback, /VeMiDi crafts\./);
});

test("category and occasion pages expose multiline intro and seo body text", () => {
  const multiline = "Първи ред\nВтори ред";
  const category = {
    ...baseCategory,
    intro_text: multiline,
    seo_body: multiline,
  };
  const occasion = {
    ...baseOccasion,
    intro_text: multiline,
    seo_body: multiline,
  };

  assert.equal(resolveCategoryIntroText(category), multiline);
  assert.equal(resolveCategorySeoBody(category), multiline);
  assert.equal(resolveCategoryIntroText(occasion), multiline);
  assert.equal(resolveCategorySeoBody(occasion), multiline);
});
