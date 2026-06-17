import assert from "node:assert/strict";
import test from "node:test";

import { getCategoryImageSrc } from "@/lib/category-images";
import {
  resolveCategoryCardImage,
  resolveCategoryCoverImage,
} from "@/lib/category-image-resolution";

test("getCategoryImageSrc maps product slugs to current image files", () => {
  assert.equal(
    getCategoryImageSrc("kutii", "product"),
    "/assets/categories/product/kutii-i-koshnichki.webp",
  );
  assert.equal(
    getCategoryImageSrc("ramki-i-pana", "product"),
    "/assets/categories/product/ramki-i-pana.png",
  );
  assert.equal(
    getCategoryImageSrc("plik-za-pari", "product"),
    "/assets/categories/product/plik-za-pari.webp",
  );
  assert.equal(
    getCategoryImageSrc("podaracheta-za-gosti", "product"),
    "/assets/categories/product/gosti.jpg",
  );
  assert.equal(
    getCategoryImageSrc("zakachalki", "product"),
    "/assets/categories/product/zakachalki-i-kljuchodarjateli.webp",
  );
  assert.equal(
    getCategoryImageSrc("gips", "product"),
    "/assets/categories/product/gips.png",
  );
  assert.equal(
    getCategoryImageSrc("bijuta", "product"),
    "/assets/categories/product/bijuta.jpg",
  );
  assert.equal(
    getCategoryImageSrc("sakndinavski muh", "product"),
    "/assets/moss.webp",
  );
  assert.equal(
    getCategoryImageSrc("family", "product"),
    "/assets/semejni.jpg",
  );
});

test("getCategoryImageSrc maps occasion slugs and aliases", () => {
  assert.equal(
    getCategoryImageSrc("krashtene", "occasion"),
    "/assets/occasion-krashtene.webp",
  );
  assert.equal(
    getCategoryImageSrc("rd", "occasion"),
    "/assets/occasion-rozhden-den.webp",
  );
  assert.equal(
    getCategoryImageSrc("8-mart", "occasion"),
    "/assets/8-mart.png",
  );
  assert.equal(
    getCategoryImageSrc("velikden", "occasion"),
    "/assets/velikden.png",
  );
  assert.equal(
    getCategoryImageSrc("koleda", "occasion"),
    "/assets/koleda.png",
  );
  assert.equal(
    getCategoryImageSrc("za-deca", "occasion"),
    "/assets/za-deca.png",
  );
  assert.equal(
    getCategoryImageSrc("home", "occasion"),
    "/assets/ocassion-new-home.png",
  );
});

test("resolveCategoryCardImage prefers uploaded card image and alt text", () => {
  const resolved = resolveCategoryCardImage({
    name: "Кутии",
    slug: "kutii",
    category_type: "product",
    image_url: "https://cdn.example.com/kutii-card.webp",
    image_alt: "Кутии и кошнички",
  });

  assert.equal(resolved.src, "https://cdn.example.com/kutii-card.webp");
  assert.equal(resolved.alt, "Кутии и кошнички");
});

test("resolveCategoryCardImage falls back to static slug asset and category name", () => {
  const resolved = resolveCategoryCardImage({
    name: "Кутии",
    slug: "kutii",
    category_type: "product",
  });

  assert.equal(resolved.src, "/assets/categories/product/kutii-i-koshnichki.webp");
  assert.equal(resolved.alt, "Кутии");
});

test("resolveCategoryCoverImage prefers cover image over card image", () => {
  const resolved = resolveCategoryCoverImage({
    name: "Кутии",
    slug: "kutii",
    category_type: "product",
    image_url: "https://cdn.example.com/kutii-card.webp",
    cover_image_url: "https://cdn.example.com/kutii-cover.webp",
    cover_image_alt: "Hero за кутии",
  });

  assert.equal(resolved.src, "https://cdn.example.com/kutii-cover.webp");
  assert.equal(resolved.alt, "Hero за кутии");
});

test("resolveCategoryCoverImage falls back to card image when cover is missing", () => {
  const resolved = resolveCategoryCoverImage({
    name: "Кутии",
    slug: "kutii",
    category_type: "product",
    image_url: "https://cdn.example.com/kutii-card.webp",
    image_alt: "Карта за кутии",
  });

  assert.equal(resolved.src, "https://cdn.example.com/kutii-card.webp");
  assert.equal(resolved.alt, "Карта за кутии");
});

test("resolveCategoryCoverImage inherits parent static hero for subcategories", () => {
  const resolved = resolveCategoryCoverImage(
    {
      name: "Малки кутии",
      slug: "malki-kutii",
      category_type: "product",
    },
    {
      name: "Кутии",
      slug: "kutii",
      category_type: "product",
    },
  );

  assert.equal(resolved.src, "/assets/categories/product/kutii-i-koshnichki.webp");
  assert.equal(resolved.alt, "Малки кутии");
});
