-- Admin-managed copy for the blog article product recommendation section.
-- Run in Supabase SQL Editor. Safe / idempotent.

alter table public.blog_posts
  add column if not exists recommendation_title text;

alter table public.blog_posts
  add column if not exists recommendation_description text;
