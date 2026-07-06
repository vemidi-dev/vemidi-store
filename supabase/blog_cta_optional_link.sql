-- Allow blog CTA link label and category to be set independently.
-- Run in Supabase SQL editor after blog_and_events.sql.

alter table public.blog_posts
  drop constraint if exists blog_posts_cta_pair_check;
