import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("home page uses only featured blog posts", () => {
  const page = readSource("../app/page.tsx");
  const homeContent = readSource("../components/home/home-content-sections.tsx");
  const repository = readSource("../lib/home/repository.ts");

  assert.match(page, /getHomeFeaturedPosts\(\)/);
  assert.match(repository, /\.eq\("is_published", true\)\.eq\("is_featured", true\)/);
  assert.match(repository, /\.limit\(3\)/);
  assert.match(page, /posts=\{featuredPosts\}/);
  assert.doesNotMatch(page, /const latestPosts = blogPosts\.slice\(0, 3\)/);

  assert.match(homeContent, /Водещи от блога/);
  assert.doesNotMatch(homeContent, /Последни от блога/);
});
