-- Blog posts and events managed from the shared store admin panel.
-- Run after admin_auth.sql and storage_product_images.sql.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content text not null,
  image_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_slug_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content text not null,
  image_url text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_slug_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint events_date_order_check check (
    ends_at is null or starts_at is null or ends_at >= starts_at
  )
);

alter table public.blog_posts add column if not exists category text;
alter table public.blog_posts add column if not exists author text default 'VeMiDi crafts';
alter table public.blog_posts add column if not exists read_minutes integer;
alter table public.blog_posts add column if not exists is_featured boolean not null default false;
alter table public.blog_posts add column if not exists is_popular boolean not null default false;

alter table public.events add column if not exists event_type text;
alter table public.events add column if not exists audience text;
alter table public.events add column if not exists format text default 'in_person';
alter table public.events add column if not exists price numeric(10,2);
alter table public.events add column if not exists capacity integer;
alter table public.events add column if not exists available_spots integer;
alter table public.events add column if not exists age_group text;
alter table public.events add column if not exists address text;
alter table public.events add column if not exists duration_minutes integer;
alter table public.events add column if not exists includes_text text;
alter table public.events add column if not exists materials_text text;
alter table public.events add column if not exists host_name text;
alter table public.events add column if not exists cancellation_policy text;
alter table public.events add column if not exists registration_url text;

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_subscribers_email_check check (
    email = lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);

create index if not exists blog_posts_published_idx
  on public.blog_posts (is_published, published_at desc);
create index if not exists events_published_idx
  on public.events (is_published, starts_at asc);

alter table public.blog_posts enable row level security;
alter table public.events enable row level security;
alter table public.newsletter_subscribers enable row level security;

grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;

create or replace function public.subscribe_newsletter(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(p_email));
begin
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email';
  end if;

  insert into public.newsletter_subscribers (email, is_active, updated_at)
  values (normalized_email, true, now())
  on conflict (email)
  do update set is_active = true, updated_at = now();
end;
$$;

revoke all on function public.subscribe_newsletter(text) from public;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;

drop policy if exists "blog_posts_public_read" on public.blog_posts;
create policy "blog_posts_public_read"
on public.blog_posts
for select
to anon, authenticated
using (is_published or public.is_admin(auth.uid()));

drop policy if exists "blog_posts_admin_insert" on public.blog_posts;
create policy "blog_posts_admin_insert"
on public.blog_posts
for insert
to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists "blog_posts_admin_update" on public.blog_posts;
create policy "blog_posts_admin_update"
on public.blog_posts
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "blog_posts_admin_delete" on public.blog_posts;
create policy "blog_posts_admin_delete"
on public.blog_posts
for delete
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read"
on public.events
for select
to anon, authenticated
using (is_published or public.is_admin(auth.uid()));

drop policy if exists "events_admin_insert" on public.events;
create policy "events_admin_insert"
on public.events
for insert
to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists "events_admin_update" on public.events;
create policy "events_admin_update"
on public.events
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "events_admin_delete" on public.events;
create policy "events_admin_delete"
on public.events
for delete
to authenticated
using (public.is_admin(auth.uid()));
