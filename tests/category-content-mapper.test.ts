import assert from "node:assert/strict";
import test from "node:test";

import type { CategoryRow } from "@/lib/admin/types";
import { mapStorefrontCategory } from "@/lib/storefront/mappers";

function baseCategoryRow(
  overrides: Partial<CategoryRow> & Pick<CategoryRow, "id" | "slug" | "name" | "category_type">,
): CategoryRow {
  return {
    parent_id: null,
    image_url: null,
    image_alt: null,
    cover_image_url: null,
    cover_image_alt: null,
    show_on_home: true,
    is_visible: true,
    home_sort_order: 0,
    card_description: null,
    hero_description: null,
    listing_heading: null,
    intro_text: null,
    seo_body: null,
    meta_title: null,
    meta_description: null,
    og_title: null,
    og_description: null,
    robots_index: null,
    ...overrides,
  };
}

test("mapStorefrontCategory passes through all content and SEO fields", () => {
  const row = baseCategoryRow({
    id: "cat-1",
    slug: "podaraci",
    name: "Подаръци",
    category_type: "product",
    hero_description: "Кратко hero описание",
    listing_heading: "Всички подаръци",
    intro_text: "Въведение\nна два реда",
    seo_body: "Дълъг SEO блок",
    meta_title: "Подаръци | VeMiDi",
    meta_description: "Meta описание",
    og_title: "OG заглавие",
    og_description: "OG описание",
    robots_index: false,
  });

  const mapped = mapStorefrontCategory({ ...row, created_at: "2026-01-01T00:00:00Z" });

  assert.equal(mapped.hero_description, "Кратко hero описание");
  assert.equal(mapped.listing_heading, "Всички подаръци");
  assert.equal(mapped.intro_text, "Въведение\nна два реда");
  assert.equal(mapped.seo_body, "Дълъг SEO блок");
  assert.equal(mapped.meta_title, "Подаръци | VeMiDi");
  assert.equal(mapped.meta_description, "Meta описание");
  assert.equal(mapped.og_title, "OG заглавие");
  assert.equal(mapped.og_description, "OG описание");
  assert.equal(mapped.robots_index, false);
});

test("mapStorefrontCategory preserves null values without coercion", () => {
  const row = baseCategoryRow({
    id: "cat-2",
    slug: "praznik",
    name: "Празник",
    category_type: "occasion",
    hero_description: null,
    listing_heading: null,
    intro_text: null,
    seo_body: null,
    meta_title: null,
    meta_description: null,
    og_title: null,
    og_description: null,
    robots_index: null,
  });

  const mapped = mapStorefrontCategory(row);

  assert.equal(mapped.hero_description, null);
  assert.equal(mapped.listing_heading, null);
  assert.equal(mapped.intro_text, null);
  assert.equal(mapped.seo_body, null);
  assert.equal(mapped.meta_title, null);
  assert.equal(mapped.meta_description, null);
  assert.equal(mapped.og_title, null);
  assert.equal(mapped.og_description, null);
  assert.equal(mapped.robots_index, null);
});

test("mapStorefrontCategory keeps empty strings distinct from null", () => {
  const row = baseCategoryRow({
    id: "cat-3",
    slug: "praznichno",
    name: "Празнично",
    category_type: "product",
    hero_description: "",
    listing_heading: "",
    intro_text: "",
    seo_body: "",
    meta_title: "",
    meta_description: "",
    og_title: "",
    og_description: "",
  });

  const mapped = mapStorefrontCategory(row);

  assert.equal(mapped.hero_description, "");
  assert.equal(mapped.listing_heading, "");
  assert.equal(mapped.intro_text, "");
  assert.equal(mapped.seo_body, "");
  assert.equal(mapped.meta_title, "");
  assert.equal(mapped.meta_description, "");
  assert.equal(mapped.og_title, "");
  assert.equal(mapped.og_description, "");
});

test("product and occasion categories use the same content field mapping", () => {
  const content = {
    hero_description: "Hero",
    listing_heading: "Heading",
    intro_text: "Intro",
    seo_body: "SEO",
    meta_title: "Meta title",
    meta_description: "Meta description",
    og_title: "OG title",
    og_description: "OG description",
    robots_index: true,
  };

  const product = mapStorefrontCategory(
    baseCategoryRow({
      id: "product-cat",
      slug: "vid",
      name: "Вид",
      category_type: "product",
      ...content,
    }),
  );

  const occasion = mapStorefrontCategory(
    baseCategoryRow({
      id: "occasion-cat",
      slug: "povod",
      name: "Повод",
      category_type: "occasion",
      ...content,
    }),
  );

  assert.deepEqual(
    {
      hero_description: product.hero_description,
      listing_heading: product.listing_heading,
      intro_text: product.intro_text,
      seo_body: product.seo_body,
      meta_title: product.meta_title,
      meta_description: product.meta_description,
      og_title: product.og_title,
      og_description: product.og_description,
      robots_index: product.robots_index,
    },
    {
      hero_description: occasion.hero_description,
      listing_heading: occasion.listing_heading,
      intro_text: occasion.intro_text,
      seo_body: occasion.seo_body,
      meta_title: occasion.meta_title,
      meta_description: occasion.meta_description,
      og_title: occasion.og_title,
      og_description: occasion.og_description,
      robots_index: occasion.robots_index,
    },
  );
});

test("mapStorefrontCategory does not generate fallback copy from name or card_description", () => {
  const row = baseCategoryRow({
    id: "cat-4",
    slug: "imen-den",
    name: "Имен ден",
    category_type: "occasion",
    card_description: "Карта описание",
    hero_description: null,
    listing_heading: null,
    meta_title: null,
    meta_description: null,
    og_title: null,
    og_description: null,
  });

  const mapped = mapStorefrontCategory(row);

  assert.equal(mapped.name, "Имен ден");
  assert.equal(mapped.card_description, "Карта описание");
  assert.equal(mapped.hero_description, null);
  assert.equal(mapped.listing_heading, null);
  assert.equal(mapped.meta_title, null);
  assert.equal(mapped.meta_description, null);
  assert.equal(mapped.og_title, null);
  assert.equal(mapped.og_description, null);
  assert.notEqual(mapped.hero_description, mapped.card_description);
  assert.notEqual(mapped.meta_title, mapped.name);
  assert.notEqual(mapped.listing_heading, mapped.name);
});
