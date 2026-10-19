import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const detail = readFileSync(resolve("components/content/event-detail-view.tsx"), "utf8");
const card = readFileSync(resolve("components/content/event-card.tsx"), "utf8");
const image = readFileSync(resolve("components/content/content-image.tsx"), "utf8");

test("event listing and detail reuse the same uploaded cover", () => {
  for (const source of [detail, card]) {
    assert.match(source, /aspect-\[16\/10\]/);
    assert.match(source, /<ContentImage src=\{event\.image_url\}/);
  }
});

test("event cover fills the aligned frame proportionally without distortion", () => {
  assert.match(detail, /grid items-start gap-5/);
  assert.match(detail, /lg:grid-cols-\[minmax\(0,1fr\)_19rem\]/);
  assert.match(detail, /xl:grid-cols-\[minmax\(0,1fr\)_20rem\]/);
  assert.match(detail, /lg:items-stretch/);
  assert.match(detail, /lg:aspect-auto/);
  assert.match(detail, /<ContentImage src=\{event\.image_url\}[^>]*fit="cover"/);
  assert.match(card, /<ContentImage src=\{event\.image_url\}[^>]*fit="contain"/);
  assert.match(detail, /<EventSocialActions[^>]* inline/);
});

test("other ContentImage consumers retain the existing cover default", () => {
  assert.match(image, /fit = "cover"/);
  assert.match(image, /fit\?: "cover" \| "contain"/);
  assert.match(image, /fit === "contain" \? "object-contain" : "object-cover"/);
  assert.doesNotMatch(image, /object-fill/);
});
