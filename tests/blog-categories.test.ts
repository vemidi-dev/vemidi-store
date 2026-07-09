import assert from "node:assert/strict";
import test from "node:test";

import {
  getBlogCategoryFilterHref,
  matchesBlogCategoryFilter,
  resolveBlogPostCategorySync,
} from "@/lib/blog-categories";
import type { BlogCategoryRow } from "@/lib/admin/types";

const category: BlogCategoryRow = {
  id: "category-one",
  name: "Идеи за кръщене",
  slug: "idei-za-krashtene",
  description: null,
  image_url: null,
  sort_order: 0,
  is_active: true,
  created_at: "2026-07-08T00:00:00.000Z",
  updated_at: "2026-07-08T00:00:00.000Z",
};

test("blog category filter URL uses slug", () => {
  assert.equal(
    getBlogCategoryFilterHref(category.slug),
    "/blog?category=idei-za-krashtene#all-articles",
  );
});

test("blog category filter matches managed category slug", () => {
  const categoriesBySlug = new Map([[category.slug, category]]);

  assert.equal(
    matchesBlogCategoryFilter(
      {
        id: "post-one",
        title: "Post",
        slug: "post",
        excerpt: "",
        content: "",
        image_url: null,
        category: category.name,
        blog_category_id: category.id,
        blog_category: category,
        author: null,
        read_minutes: null,
        is_featured: false,
        is_popular: false,
        cta_link_label: null,
        cta_category_id: null,
        is_published: true,
        published_at: null,
        created_at: "2026-07-08T00:00:00.000Z",
        updated_at: "2026-07-08T00:00:00.000Z",
      },
      category.slug,
      categoriesBySlug,
    ),
    true,
  );
});

test("blog category filter keeps legacy category fallback", () => {
  const categoriesBySlug = new Map([[category.slug, category]]);

  assert.equal(
    matchesBlogCategoryFilter(
      {
        id: "legacy-post",
        title: "Legacy",
        slug: "legacy",
        excerpt: "",
        content: "",
        image_url: null,
        category: category.name,
        blog_category_id: null,
        author: null,
        read_minutes: null,
        is_featured: false,
        is_popular: false,
        cta_link_label: null,
        cta_category_id: null,
        is_published: true,
        published_at: null,
        created_at: "2026-07-08T00:00:00.000Z",
        updated_at: "2026-07-08T00:00:00.000Z",
      },
      category.slug,
      categoriesBySlug,
    ),
    true,
  );
});

test("blog post category sync writes selected id and legacy name", () => {
  assert.deepEqual(
    resolveBlogPostCategorySync(
      category.id,
      new Map([[category.id, { id: category.id, name: category.name }]]),
    ),
    { blog_category_id: category.id, category: category.name },
  );
});
