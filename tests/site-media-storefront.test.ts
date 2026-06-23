import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefrontTargets = [
  {
    file: "../app/page.tsx",
    key: "home.hero",
    extra: /heroImage=\{heroImage\}/,
  },
  {
    file: "../app/page.tsx",
    key: "home.atelier",
    extra: /atelierImage=\{atelierImage\}/,
  },
  {
    file: "../app/shop/page.tsx",
    key: "shop.hero",
    extra: /imageSrc=\{heroImage\.src\}/,
  },
  {
    file: "../app/categories/page.tsx",
    key: "categories.hero",
    extra: /imageAlt=\{heroImage\.alt\}/,
  },
  {
    file: "../app/occasions/page.tsx",
    key: "occasions.hero",
    extra: /resolveSiteMediaFromMap\(siteMediaMap, "occasions\.hero"\)/,
  },
  {
    file: "../app/blog/page.tsx",
    key: "blog.hero",
    extra: /getSiteMediaMap\(\)/,
  },
  {
    file: "../app/events/page.tsx",
    key: "events.hero",
    extra: /imageSrc=\{heroImage\.src\}/,
  },
  {
    file: "../app/about/page.tsx",
    key: "about.hero",
    extra: /src=\{heroImage\.src\}/,
  },
  {
    file: "../app/thank-you/page.tsx",
    key: "checkout.thank_you",
    extra: /heroImage=\{heroImage\}/,
  },
] as const;

for (const target of storefrontTargets) {
  test(`${target.key} is wired via site media resolver in ${target.file}`, () => {
    const source = readFileSync(new URL(target.file, import.meta.url), "utf8");

    assert.match(source, /getSiteMediaMap\(\)/);
    assert.match(
      source,
      new RegExp(`resolveSiteMediaFromMap\\(siteMediaMap, "${target.key}"\\)`),
    );
    assert.match(source, target.extra);
  });
}

test("home hero component uses image props instead of hardcoded asset", () => {
  const source = readFileSync(
    new URL("../components/home/home-hero.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /\/assets\/home-hero\.webp/);
  assert.match(source, /heroImage\.src/);
  assert.match(source, /heroImage\.alt/);
});

test("home atelier component uses image props instead of hardcoded asset", () => {
  const source = readFileSync(
    new URL("../components/home/home-story.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /\/assets\/home-atelier\.webp/);
  assert.match(source, /atelierImage\.src/);
  assert.match(source, /atelierImage\.alt/);
});

test("thank-you content uses hero image props instead of hardcoded asset", () => {
  const source = readFileSync(
    new URL("../components/thank-you/thank-you-content.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /\/assets\/thank-you\.webp/);
  assert.match(source, /heroImage\.src/);
  assert.match(source, /heroImage\.alt/);
});

test("hub pages no longer hardcode Phase 1 hero assets", () => {
  const hubPages = [
    "../app/shop/page.tsx",
    "../app/categories/page.tsx",
    "../app/occasions/page.tsx",
    "../app/blog/page.tsx",
    "../app/events/page.tsx",
  ];

  for (const file of hubPages) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /imageSrc="\/assets\//);
  }
});
