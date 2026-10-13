import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("home page uses only featured blog posts", () => {
  const page = readSource("../app/page.tsx");
  const homeContent = readSource("../components/home/home-content-sections.tsx");

  assert.match(page, /const featuredPosts = blogPosts\.filter\(\(post\) => post\.is_featured\)\.slice\(0, 3\)/);
  assert.match(page, /posts=\{featuredPosts\}/);
  assert.doesNotMatch(page, /const latestPosts = blogPosts\.slice\(0, 3\)/);

  assert.match(homeContent, /Водещи от блога/);
  assert.doesNotMatch(homeContent, /Последни от блога/);
});
