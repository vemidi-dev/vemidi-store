import assert from "node:assert/strict";
import test from "node:test";

import type { BlogPostRow } from "@/lib/admin/types";
import { buildArticleSchema } from "@/lib/seo/article-schema";
import { compactJsonLd } from "@/lib/seo/json-ld";

const siteUrl = new URL("https://vemidi-store.vercel.app");

const post: BlogPostRow = {
  id: "post-1",
  title: "Идеи за подарък",
  slug: "idei-za-podarak",
  excerpt: "Практични идеи за персонализирани подаръци.",
  content: "Пълен текст.",
  image_url: "https://cdn.example.com/blog/post.jpg",
  category: "Идеи",
  author: "VeMiDi crafts",
  read_minutes: 5,
  is_featured: true,
  is_popular: false,
  cta_link_label: null,
  cta_category_id: null,
  is_published: true,
  published_at: "2026-01-10T10:00:00.000Z",
  created_at: "2026-01-01T10:00:00.000Z",
  updated_at: "2026-01-12T10:00:00.000Z",
};

test("article schema uses Person author when post author is provided", () => {
  const schema = buildArticleSchema(post, siteUrl);

  assert.equal(schema["@type"], "Article");
  assert.equal(schema.headline, post.title);
  assert.equal(schema.description, post.excerpt);
  assert.equal(schema.datePublished, post.published_at);
  assert.equal(schema.dateModified, post.updated_at);
  assert.equal(schema.image?.[0], post.image_url);
  assert.equal(schema.author["@type"], "Person");
  assert.equal(schema.author.name, "VeMiDi crafts");
  assert.equal(schema.publisher.name, "VeMiDi crafts");
  assert.equal(schema.url, `${siteUrl.origin}/blog/idei-za-podarak`);
});

test("article schema falls back to Organization author when post author is missing", () => {
  const schema = buildArticleSchema({ ...post, author: null }, siteUrl);

  assert.equal(schema.author["@type"], "Organization");
  assert.equal(schema.author.name, "VeMiDi crafts");
});

test("article schema skips missing image", () => {
  const schema = compactJsonLd(
    buildArticleSchema({ ...post, image_url: null }, siteUrl),
  ) as Record<string, unknown>;

  assert.equal("image" in schema, false);
});
