import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("workshop photos use the same portrait ratio as product photos without distortion", () => {
  const gallery = readFileSync("components/content/event-photo-gallery.tsx", "utf8");
  const product = readFileSync("components/product/product-detail-gallery.tsx", "utf8");
  assert.match(gallery, /aspect-\[4\/5\]/);
  assert.match(product, /aspect-\[4\/5\]/);
  assert.doesNotMatch(gallery, /aspect-\[3\/2\]|object-fill/);
  assert.match(gallery, /sm:grid-cols-2/);
  assert.match(gallery, /sizes="\(max-width: 639px\)/);
  assert.match(gallery, /className="object-contain"/);
  assert.match(gallery, /showModal\(\)/);
  assert.match(gallery, /onClose=\{\(\) => setSelected\(null\)\}/);
});
