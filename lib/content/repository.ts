import type { BlogCategoryRow, BlogPostRow, EventRow } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";

const blogPostSelect = `
  *,
  blog_category:blog_categories (
    id,
    name,
    slug,
    description,
    image_url,
    sort_order,
    is_active
  )
`;

function isMissingBlogCategoriesTable(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("blog_categories"));
}

export async function getActiveBlogCategories(): Promise<BlogCategoryRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("blog_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return error ? [] : ((data ?? []) as BlogCategoryRow[]);
}

export async function getPublishedBlogPosts(): Promise<BlogPostRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const joined = await supabase
    .from("blog_posts")
    .select(blogPostSelect)
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (!joined.error) {
    return (joined.data ?? []) as BlogPostRow[];
  }

  if (!isMissingBlogCategoriesTable(joined.error)) {
    return [];
  }

  const fallback = await supabase
    .from("blog_posts")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  return fallback.error ? [] : ((fallback.data ?? []) as BlogPostRow[]);
}

export async function getPublishedBlogPost(slug: string): Promise<BlogPostRow | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const joined = await supabase
    .from("blog_posts")
    .select(blogPostSelect)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!joined.error) {
    return joined.data as BlogPostRow | null;
  }

  if (!isMissingBlogCategoriesTable(joined.error)) {
    return null;
  }

  const fallback = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return fallback.error ? null : (fallback.data as BlogPostRow | null);
}

export async function getBlogPostProductIds(postId: string): Promise<string[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("blog_post_products")
    .select("product_id")
    .eq("blog_post_id", postId)
    .order("sort_order", { ascending: true });

  return error
    ? []
    : (data ?? [])
        .map((row) => String(row.product_id ?? ""))
        .filter(Boolean);
}

export async function getPublishedEvents(): Promise<EventRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_published", true)
    .order("starts_at", { ascending: true, nullsFirst: false });

  return error ? [] : ((data ?? []) as EventRow[]);
}

export async function getPublishedEvent(slug: string): Promise<EventRow | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return error ? null : (data as EventRow | null);
}
