import assert from "node:assert/strict";
import test from "node:test";
import { EVENT_GALLERY_SOURCE_MAX_BYTES, EVENT_GALLERY_TARGET_BYTES, eventGalleryDimensions, prepareEventGalleryImages, validateEventGallerySelection } from "@/lib/events/prepare-gallery-images";
import { getImageProfile } from "@/lib/images/profiles";

function image(bytes = 20 * 1024 * 1024, type = "image/jpeg") {
  const file = new File(["source"], "photo.jpg", { type });
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}
test("gallery accepts large originals for client compression, with bounded source/count limits", () => {
  assert.equal(validateEventGallerySelection([image()]), null);
  assert.equal(validateEventGallerySelection([image(EVENT_GALLERY_SOURCE_MAX_BYTES)]), null);
  assert.match(validateEventGallerySelection([image(EVENT_GALLERY_SOURCE_MAX_BYTES + 1)])!, /50 MB/);
  assert.equal(validateEventGallerySelection(Array(12).fill(image())), null);
  assert.match(validateEventGallerySelection(Array(13).fill(image()))!, /12/);
  assert.match(validateEventGallerySelection([])!, /Изберете/);
  assert.match(validateEventGallerySelection([image(0)])!, /празен/);
  assert.match(validateEventGallerySelection([image(10, "image/svg+xml")])!, /PNG, JPG и WEBP/);
});
test("archive dimensions preserve aspect ratio and do not upscale small photos", () => {
  assert.deepEqual(eventGalleryDimensions(4000, 3000), { width: 1400, height: 1050 });
  assert.deepEqual(eventGalleryDimensions(3000, 4000), { width: 1050, height: 1400 });
  assert.deepEqual(eventGalleryDimensions(320, 240), { width: 320, height: 240 });
  assert.equal(getImageProfile("event_gallery").minShortEdge, 1);
  assert.equal(getImageProfile("product").minShortEdge, 480);
  assert.ok(EVENT_GALLERY_TARGET_BYTES * getImageProfile("event_gallery").maxFilesPerUpload < 3.3 * 1024 * 1024);
});
test("invalid batches are rejected before decoding or any network call", async () => {
  await assert.rejects(prepareEventGalleryImages([]), /Изберете/);
  await assert.rejects(prepareEventGalleryImages(Array(13).fill(image())), /12/);
});
