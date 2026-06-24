import assert from "node:assert/strict";
import test from "node:test";

import {
  categoryContentLimits,
  getCategoryContentFormDefaults,
  getCategoryRobotsIndexSelectValue,
  hasCategoryContentGap,
  parseCategoryContentFromFormData,
  parseCategoryRobotsIndex,
} from "@/lib/admin/category-content";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { CategoryRow } from "@/lib/admin/types";

function setCategoryContentFields(formData: FormData, values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
}

test("parseCategoryContentFromFormData maps all content and SEO fields", () => {
  const formData = new FormData();
  setCategoryContentFields(formData, {
    [adminFormFields.category.heroDescription]: "Hero copy",
    [adminFormFields.category.listingHeading]: "Heading",
    [adminFormFields.category.introText]: "Intro\nline two",
    [adminFormFields.category.seoBody]: "SEO body",
    [adminFormFields.category.metaTitle]: "Meta title",
    [adminFormFields.category.metaDescription]: "Meta description",
    [adminFormFields.category.ogTitle]: "OG title",
    [adminFormFields.category.ogDescription]: "OG description",
    [adminFormFields.category.robotsIndex]: "true",
  });

  const { payload, error } = parseCategoryContentFromFormData(formData);

  assert.equal(error, null);
  assert.deepEqual(payload, {
    hero_description: "Hero copy",
    listing_heading: "Heading",
    intro_text: "Intro\nline two",
    seo_body: "SEO body",
    meta_title: "Meta title",
    meta_description: "Meta description",
    og_title: "OG title",
    og_description: "OG description",
    robots_index: true,
  });
});

test("parseCategoryContentFromFormData trims and converts blank values to null", () => {
  const formData = new FormData();
  setCategoryContentFields(formData, {
    [adminFormFields.category.heroDescription]: "  \n  ",
    [adminFormFields.category.listingHeading]: "  Heading  ",
    [adminFormFields.category.introText]: "",
    [adminFormFields.category.seoBody]: "   ",
    [adminFormFields.category.metaTitle]: "\t",
    [adminFormFields.category.metaDescription]: "  ",
    [adminFormFields.category.ogTitle]: "",
    [adminFormFields.category.ogDescription]: " ",
    [adminFormFields.category.robotsIndex]: "auto",
  });

  const { payload, error } = parseCategoryContentFromFormData(formData);

  assert.equal(error, null);
  assert.equal(payload.hero_description, null);
  assert.equal(payload.listing_heading, "Heading");
  assert.equal(payload.intro_text, null);
  assert.equal(payload.seo_body, null);
  assert.equal(payload.meta_title, null);
  assert.equal(payload.meta_description, null);
  assert.equal(payload.og_title, null);
  assert.equal(payload.og_description, null);
  assert.equal(payload.robots_index, null);
});

test("parseCategoryContentFromFormData preserves multiline text", () => {
  const formData = new FormData();
  const multiline = "Първи ред\n\nВтори ред";
  formData.set(adminFormFields.category.introText, `  ${multiline}  `);
  formData.set(adminFormFields.category.seoBody, multiline);

  const { payload, error } = parseCategoryContentFromFormData(formData);

  assert.equal(error, null);
  assert.equal(payload.intro_text, multiline);
  assert.equal(payload.seo_body, multiline);
});

test("parseCategoryContentFromFormData rejects values over SQL limits", () => {
  const formData = new FormData();
  formData.set(
    adminFormFields.category.metaDescription,
    "x".repeat(categoryContentLimits.meta_description + 1),
  );

  const { error } = parseCategoryContentFromFormData(formData);

  assert.match(error ?? "", /Meta описание/);
  assert.match(error ?? "", /160/);
});

test("parseCategoryRobotsIndex supports auto, index and noindex", () => {
  const auto = new FormData();
  auto.set(adminFormFields.category.robotsIndex, "auto");
  assert.equal(parseCategoryRobotsIndex(auto), null);

  const empty = new FormData();
  assert.equal(parseCategoryRobotsIndex(empty), null);

  const index = new FormData();
  index.set(adminFormFields.category.robotsIndex, "true");
  assert.equal(parseCategoryRobotsIndex(index), true);

  const noindex = new FormData();
  noindex.set(adminFormFields.category.robotsIndex, "false");
  assert.equal(parseCategoryRobotsIndex(noindex), false);
});

test("create and update payloads include parsed category content fields", () => {
  const formData = new FormData();
  formData.set(adminFormFields.category.heroDescription, "Hero");
  formData.set(adminFormFields.category.listingHeading, "List");
  formData.set(adminFormFields.category.robotsIndex, "false");

  const { payload } = parseCategoryContentFromFormData(formData);
  const createPayload = {
    name: "Категория",
    slug: "kategoriya",
    category_type: "product",
    card_description: null,
    ...payload,
  };
  const updatePayload = {
    name: "Категория",
    slug: "kategoriya",
    category_type: "occasion",
    card_description: "Card",
    ...payload,
  };

  assert.equal(createPayload.hero_description, "Hero");
  assert.equal(createPayload.listing_heading, "List");
  assert.equal(createPayload.robots_index, false);
  assert.equal(updatePayload.hero_description, "Hero");
  assert.equal(updatePayload.category_type, "occasion");
});

test("getCategoryContentFormDefaults passes current DB values to edit form", () => {
  const category: Pick<
    CategoryRow,
    | "hero_description"
    | "listing_heading"
    | "intro_text"
    | "seo_body"
    | "meta_title"
    | "meta_description"
    | "og_title"
    | "og_description"
    | "robots_index"
  > = {
    hero_description: "Hero DB",
    listing_heading: "Heading DB",
    intro_text: "Intro\nDB",
    seo_body: null,
    meta_title: "Meta DB",
    meta_description: null,
    og_title: "OG DB",
    og_description: "OG desc DB",
    robots_index: false,
  };

  assert.deepEqual(getCategoryContentFormDefaults(category), {
    hero_description: "Hero DB",
    listing_heading: "Heading DB",
    intro_text: "Intro\nDB",
    seo_body: "",
    meta_title: "Meta DB",
    meta_description: "",
    og_title: "OG DB",
    og_description: "OG desc DB",
    robots_index: "false",
  });
  assert.equal(getCategoryRobotsIndexSelectValue(null), "auto");
  assert.equal(getCategoryRobotsIndexSelectValue(true), "true");
});

test("hasCategoryContentGap is true when page content fields are empty", () => {
  assert.equal(
    hasCategoryContentGap({
      hero_description: null,
      intro_text: null,
      seo_body: null,
      meta_description: null,
    }),
    true,
  );
  assert.equal(
    hasCategoryContentGap({
      hero_description: "Hero",
      intro_text: null,
      seo_body: null,
      meta_description: null,
    }),
    false,
  );
});
