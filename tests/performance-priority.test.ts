import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readComponent(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function countMatches(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

test("header logo is not marked as LCP priority", () => {
  const source = readComponent("components/layout/header.tsx");
  const logoBlock = source.slice(
    source.indexOf('src="/assets/logo-transparent-color.png"'),
    source.indexOf('alt="VeMiDi crafts logo"') + 40,
  );

  assert.doesNotMatch(logoBlock, /\bpriority\b/);
});

test("home hero image keeps priority within its component", () => {
  const source = readComponent("components/home/home-hero.tsx");

  assert.match(source, /\bpriority\b/);
  assert.equal(countMatches(source, /\bpriority\b/g), 1);
});

test("visual page hero image keeps priority within its component", () => {
  const source = readComponent("components/layout/visual-page-hero.tsx");

  assert.match(source, /\bpriority\b/);
  assert.equal(countMatches(source, /\bpriority\b/g), 1);
});

test("product detail gallery prioritizes only the first visible image", () => {
  const source = readComponent("components/product/product-detail-gallery.tsx");

  assert.match(source, /priority=\{safeIndex === 0\}/);
  assert.doesNotMatch(source, /\bpriority=\{true\}/);
  assert.doesNotMatch(source, /\bpriority\s*\n/);
});

test("about page defers image loading without priority", () => {
  const source = readComponent("app/about/page.tsx");
  const aboutImageBlock = source.slice(
    source.indexOf('src="/assets/about.png"'),
    source.indexOf('className="object-cover"') + 30,
  );

  assert.doesNotMatch(aboutImageBlock, /\bpriority\b/);
});

test("thank-you hero keeps priority within its component", () => {
  const source = readComponent("components/thank-you/thank-you-content.tsx");
  const heroBlock = source.slice(
    source.indexOf('src="/assets/thank-you.webp"'),
    source.indexOf('className="object-cover"') + 30,
  );

  assert.match(heroBlock, /\bpriority\b/);
  assert.equal(countMatches(source, /\bpriority\b/g), 1);
});

test("hero containers reserve height with existing min-height classes", () => {
  const homeHero = readComponent("components/home/home-hero.tsx");
  const visualHero = readComponent("components/layout/visual-page-hero.tsx");
  const thankYou = readComponent("components/thank-you/thank-you-content.tsx");
  const gallery = readComponent("components/product/product-detail-gallery.tsx");

  assert.match(homeHero, /min-h-\[17rem\]/);
  assert.match(homeHero, /sm:min-h-\[22rem\]/);
  assert.match(visualHero, /min-h-48/);
  assert.match(visualHero, /sm:min-h-72/);
  assert.match(thankYou, /min-h-72/);
  assert.match(gallery, /aspect-\[4\/5\]/);
});
