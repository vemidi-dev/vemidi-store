-- Category and occasion content + SEO fields for admin-managed public copy.
-- Safe to re-run. Does not modify card_description, visibility, images, or hierarchy.

begin;

alter table public.categories
  add column if not exists hero_description text,
  add column if not exists listing_heading text,
  add column if not exists intro_text text,
  add column if not exists seo_body text,
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists og_title text,
  add column if not exists og_description text,
  add column if not exists robots_index boolean;

comment on column public.categories.hero_description is
  'Short hero description on category or occasion landing pages.';
comment on column public.categories.listing_heading is
  'Heading above the product listing on category or occasion pages.';
comment on column public.categories.intro_text is
  'Optional multiline intro copy below the hero.';
comment on column public.categories.seo_body is
  'Optional long plain-text SEO block at the bottom of the page.';
comment on column public.categories.meta_title is
  'Optional HTML title override.';
comment on column public.categories.meta_description is
  'Optional meta description override.';
comment on column public.categories.og_title is
  'Optional Open Graph title override.';
comment on column public.categories.og_description is
  'Optional Open Graph description override.';
comment on column public.categories.robots_index is
  'Optional robots index override. Null keeps automatic indexability rules.';

alter table public.categories
  drop constraint if exists categories_listing_heading_length_check;
alter table public.categories
  add constraint categories_listing_heading_length_check check (
    listing_heading is null or char_length(listing_heading) <= 120
  );

alter table public.categories
  drop constraint if exists categories_meta_title_length_check;
alter table public.categories
  add constraint categories_meta_title_length_check check (
    meta_title is null or char_length(meta_title) <= 120
  );

alter table public.categories
  drop constraint if exists categories_og_title_length_check;
alter table public.categories
  add constraint categories_og_title_length_check check (
    og_title is null or char_length(og_title) <= 120
  );

alter table public.categories
  drop constraint if exists categories_hero_description_length_check;
alter table public.categories
  add constraint categories_hero_description_length_check check (
    hero_description is null or char_length(hero_description) <= 500
  );

alter table public.categories
  drop constraint if exists categories_meta_description_length_check;
alter table public.categories
  add constraint categories_meta_description_length_check check (
    meta_description is null or char_length(meta_description) <= 160
  );

alter table public.categories
  drop constraint if exists categories_og_description_length_check;
alter table public.categories
  add constraint categories_og_description_length_check check (
    og_description is null or char_length(og_description) <= 160
  );

alter table public.categories
  drop constraint if exists categories_intro_text_length_check;
alter table public.categories
  add constraint categories_intro_text_length_check check (
    intro_text is null or char_length(intro_text) <= 2000
  );

alter table public.categories
  drop constraint if exists categories_seo_body_length_check;
alter table public.categories
  add constraint categories_seo_body_length_check check (
    seo_body is null or char_length(seo_body) <= 10000
  );

-- Backfill only empty columns; never overwrite existing values.
-- Values are trimmed and truncated to satisfy length constraints.
update public.categories
set
  hero_description = left(btrim(card_description), 500)
where hero_description is null
  and card_description is not null
  and btrim(card_description) <> '';

update public.categories
set listing_heading = left(btrim(name), 120)
where listing_heading is null
  and btrim(name) <> '';

update public.categories
set meta_title = left(btrim(name), 120)
where meta_title is null
  and btrim(name) <> '';

update public.categories
set meta_description = left(btrim(card_description), 160)
where meta_description is null
  and card_description is not null
  and btrim(card_description) <> '';

update public.categories
set og_title = left(btrim(name), 120)
where og_title is null
  and btrim(name) <> '';

update public.categories
set og_description = left(btrim(card_description), 160)
where og_description is null
  and card_description is not null
  and btrim(card_description) <> '';

commit;
