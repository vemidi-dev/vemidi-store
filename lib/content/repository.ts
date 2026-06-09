import type { BlogPostRow, EventRow } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";

export async function getPublishedBlogPosts(): Promise<BlogPostRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  return error ? [] : ((data ?? []) as BlogPostRow[]);
}

export async function getPublishedBlogPost(slug: string): Promise<BlogPostRow | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return error ? null : (data as BlogPostRow | null);
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
