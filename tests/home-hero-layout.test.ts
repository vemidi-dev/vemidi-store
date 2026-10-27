import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveHomeHeroPreview } from "../lib/home/hero-preview";
import type { ResolvedSiteMedia } from "../lib/content/site-media-types";

test("inner page banners blend uploaded media without tinting their text", () => {
  const source = readFileSync("components/layout/visual-page-hero.tsx", "utf8");
  const css = readFileSync("components/layout/visual-page-hero.module.css", "utf8");
  assert.match(source, /src=\{imageSrc\}/);
  assert.match(source, /objectPosition: imagePosition/);
  assert.match(source, /const Description = descriptionAs/);
  assert.equal((source.match(/\bpriority\b/g) ?? []).length, 1);
  assert.match(css, /mask-image: linear-gradient\(90deg, transparent/);
  assert.match(css, /mask-image: linear-gradient\(180deg, transparent/);
  assert.match(css, /\.copy \{ width: 37%; \}/);
  assert.match(css, /aspect-ratio: 2 \/ 1/);
  assert.doesNotMatch(css, /object-fit: fill|font-size:[^;]*vw/);
});

test("contact order CTA explicitly overrides inherited light text in normal and interactive states", () => {
  const source = readFileSync("app/contact/page.tsx", "utf8");
  const css = readFileSync("components/layout/contact-order-cta.module.css", "utf8");
  assert.match(source, /ctaStyles.link/);
  assert.match(source, /mailto:\$\{email\}\?subject=/);
  assert.match(css, /color: #34452d; background: #fff/);
  assert.match(css, /\.link:hover,/);
  assert.match(css, /\.link:focus-visible/);
  assert.match(css, /color: #24351e; background: #edf2e9/);
});

test("home moves straight from hero discovery links to catalog without a benefits strip", () => {
  const page = readFileSync("app/page.tsx", "utf8");
  assert.doesNotMatch(page, /HomeBenefits/);
  assert.match(page, /<HomeHero[^\n]+\n\s*<Suspense[^\n]+<HomeCatalogContent/);
});

test("preview banners are fallback-only and never override an uploaded admin image", () => {
  const image: ResolvedSiteMedia = { src: "https://example.com/admin.webp", alt: "Качена снимка", source: "uploaded" };
  const fallback: ResolvedSiteMedia = { src: "/assets/home-hero.webp", alt: "Начална снимка", source: "fallback" };
  const originalEnvironment = process.env.VERCEL_ENV;
  const originalPreview = process.env.HOME_HERO_PREVIEW_IMAGE;
  try {
    process.env.VERCEL_ENV = "preview";
    delete process.env.HOME_HERO_PREVIEW_IMAGE;
    assert.equal(resolveHomeHeroPreview(image), image);
    process.env.HOME_HERO_PREVIEW_IMAGE = "christmas";
    assert.equal(resolveHomeHeroPreview(image), image);
    assert.equal(resolveHomeHeroPreview(fallback).src, "/assets/home-hero-christmas.webp");
    process.env.HOME_HERO_PREVIEW_IMAGE = "christmas-snowflakes";
    assert.equal(resolveHomeHeroPreview(image), image);
    assert.equal(resolveHomeHeroPreview(fallback).src, "/assets/home-hero-christmas-snowflakes.webp");
    const replacement: ResolvedSiteMedia = { ...image, src: "https://example.com/replacement.webp", alt: "Нова снимка" };
    assert.equal(resolveHomeHeroPreview(replacement), replacement);
    process.env.VERCEL_ENV = "production";
    assert.equal(resolveHomeHeroPreview(image), image);
    assert.equal(resolveHomeHeroPreview(fallback), fallback);
  } finally {
    if (originalEnvironment === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = originalEnvironment;
    if (originalPreview === undefined) delete process.env.HOME_HERO_PREVIEW_IMAGE; else process.env.HOME_HERO_PREVIEW_IMAGE = originalPreview;
  }
});

test("hero retains one priority photo, editable copy and all four discovery paths", () => {
  const hero = readFileSync("components/home/home-hero.tsx", "utf8");
  assert.equal((hero.match(/\bpriority\b/g) ?? []).length, 1);
  assert.match(hero, /src=\{heroImage.src\}/);
  assert.match(hero, /alt=\{heroImage.alt\}/);
  assert.match(hero, /content\["home.hero_title_line_1"\]/);
  assert.match(hero, /<HomeQuickPaths content=\{content\}/);
  assert.match(hero, /personalization=only#product-grid/);
  const styles = readFileSync("components/home/home-hero.module.css", "utf8");
  assert.match(styles, /font-family: var\(--font-playfair\)/);
  assert.match(styles, /\.copy \{ width: 40%;/);
  assert.match(styles, /mask-image: linear-gradient\(90deg, transparent, #000 40%\)/);
  assert.match(styles, /aspect-ratio: 2 \/ 1/);
  assert.match(styles, /\.scene \{ width: auto; height: 100%; \}/);
  assert.match(styles, /grid-template-areas: "copy" "scene"/);
  assert.match(styles, /height: calc\(50vw \+ 64px\)/);
  assert.match(styles, /min-height: min\(640px, 50vw, calc\(100svh - 176px\)\)/);
  assert.doesNotMatch(styles, /\.shade|object-fit: contain/);
  assert.doesNotMatch(styles, /object-fit: fill|font-size:.*vw|filter: blur/);
});

test("hero actions share the mobile photo area and wide compositions are centered together", () => {
  const hero = readFileSync("components/home/home-hero.tsx", "utf8");
  const styles = readFileSync("components/home/home-hero.module.css", "utf8");
  assert.match(hero, /Разгледай продуктите/);
  assert.doesNotMatch(hero, /Разгледай подаръците/);
  assert.equal((hero.match(/data-hero-actions/g) ?? []).length, 1);
  assert.match(styles, /\.actions \{[^}]*grid-area: scene/);
  assert.match(styles, /max-width: 1440px/);
  assert.match(styles, /right: max\(0px, calc\(\(100% - 1600px\) \/ 2\)\)/);
  assert.match(styles, /#000 94%, transparent/);
});
