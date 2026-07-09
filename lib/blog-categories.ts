import { getOptionalString } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { BlogCategoryRow, BlogPostRow } from "@/lib/admin/types";

export type BlogPostWithCategory = BlogPostRow & {
  blog_category?: BlogCategoryRow | null;
};

export function getBlogPostCategoryName(post: BlogPostWithCategory): string {
  return post.blog_category?.name ?? post.category ?? "Блог";
}

export function getBlogCategoryFilterHref(slug: string): string {
  return `/blog?category=${encodeURIComponent(slug)}#all-articles`;
}

export function postsShareBlogCategory(
  left: Pick<BlogPostRow, "blog_category_id" | "category">,
  right: Pick<BlogPostRow, "blog_category_id" | "category">,
): boolean {
  if (left.blog_category_id && right.blog_category_id) {
    return left.blog_category_id === right.blog_category_id;
  }
  if (left.category && right.category) {
    return left.category === right.category;
  }
  return false;
}

export function matchesBlogCategoryFilter(
  post: BlogPostWithCategory,
  categoryParam: string,
  categoriesBySlug: ReadonlyMap<string, BlogCategoryRow>,
): boolean {
  const filter = categoryParam.trim();
  if (!filter) {
    return true;
  }

  const managedCategory = categoriesBySlug.get(filter);
  if (managedCategory) {
    if (post.blog_category_id === managedCategory.id) {
      return true;
    }
    if (!post.blog_category_id && post.category === managedCategory.name) {
      return true;
    }
    return false;
  }

  if (post.blog_category?.slug === filter) {
    return true;
  }

  return post.category === filter;
}

export function parseBlogPostCategoryId(formData: FormData): string | null {
  return getOptionalString(formData, adminFormFields.blog.blogCategoryId);
}

export function resolveBlogPostCategorySync(
  blogCategoryId: string | null,
  categoriesById: ReadonlyMap<string, Pick<BlogCategoryRow, "id" | "name">>,
): { blog_category_id: string | null; category: string | null } {
  if (!blogCategoryId) {
    return { blog_category_id: null, category: null };
  }

  const category = categoriesById.get(blogCategoryId);
  if (!category) {
    return { blog_category_id: blogCategoryId, category: null };
  }

  return {
    blog_category_id: category.id,
    category: category.name,
  };
}

export function isValidBlogCategorySlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
