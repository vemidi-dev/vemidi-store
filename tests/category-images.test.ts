import assert from "node:assert/strict";
import test from "node:test";

import { getCategoryImageSrc } from "@/lib/category-images";

test("getCategoryImageSrc maps product slugs to current image files", () => {
  assert.equal(
    getCategoryImageSrc("kutii", "product"),
    "/assets/categories/product/kutii.png",
  );
  assert.equal(
    getCategoryImageSrc("ramki-i-pana", "product"),
    "/assets/categories/product/ramki-pana.jpg",
  );
  assert.equal(
    getCategoryImageSrc("plik-za-pari", "product"),
    "/assets/categories/product/plik-za-pari.png",
  );
  assert.equal(
    getCategoryImageSrc("podaracheta-za-gosti", "product"),
    "/assets/categories/product/gosti.jpg",
  );
  assert.equal(
    getCategoryImageSrc("zakachalki", "product"),
    "/assets/categories/product/zakachalki-kluch.png",
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
    "/assets/moss.png",
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
