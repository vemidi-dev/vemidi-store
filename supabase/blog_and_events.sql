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
alter table public.blog_posts add column if not exists cta_link_label text;
alter table public.blog_posts
  add column if not exists cta_category_id uuid
  references public.categories (id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'blog_posts_cta_pair_check'
      and conrelid = 'public.blog_posts'::regclass
  ) then
    alter table public.blog_posts
      add constraint blog_posts_cta_pair_check check (
        (cta_link_label is null and cta_category_id is null)
        or (nullif(trim(cta_link_label), '') is not null and cta_category_id is not null)
      );
  end if;
end
$$;

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_available_spots_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_available_spots_check check (
        available_spots is null
        or (
          available_spots >= 0
          and (capacity is null or available_spots <= capacity)
        )
      ) not valid;
  end if;
end
$$;

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  participant_count integer not null default 1,
  note text,
  status text not null default 'new',
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_registrations_participant_count_check
    check (participant_count between 1 and 10),
  constraint event_registrations_status_check
    check (status in ('new', 'confirmed', 'cancelled'))
);

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
create index if not exists event_registrations_event_created_idx
  on public.event_registrations (event_id, created_at desc);

alter table public.blog_posts enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.newsletter_subscribers enable row level security;

grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant select on public.event_registrations to authenticated;

create or replace function public.register_for_event(
  p_event_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_participant_count integer,
  p_note text,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events%rowtype;
  existing_registration_id uuid;
  registration_id uuid;
  normalized_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
begin
  select id
  into existing_registration_id
  from public.event_registrations
  where idempotency_key = p_idempotency_key;

  if existing_registration_id is not null then
    return existing_registration_id;
  end if;

  if char_length(trim(coalesce(p_full_name, ''))) < 3 then
    raise exception 'invalid_full_name';
  end if;
  if char_length(trim(coalesce(p_phone, ''))) < 6 then
    raise exception 'invalid_phone';
  end if;
  if normalized_email is not null
    and normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_email';
  end if;
  if p_participant_count is null or p_participant_count not between 1 and 10 then
    raise exception 'invalid_participant_count';
  end if;

  select *
  into target_event
  from public.events
  where id = p_event_id
  for update;

  if target_event.id is null or not target_event.is_published then
    raise exception 'event_not_found';
  end if;
  if target_event.starts_at is not null and target_event.starts_at <= now() then
    raise exception 'event_has_started';
  end if;
  if nullif(trim(coalesce(target_event.registration_url, '')), '') is not null then
    raise exception 'external_registration_only';
  end if;
  if target_event.available_spots is null then
    raise exception 'registration_not_configured';
  end if;
  if target_event.available_spots < p_participant_count then
    raise exception 'not_enough_spots';
  end if;

  insert into public.event_registrations (
    event_id,
    full_name,
    phone,
    email,
    participant_count,
    note,
    idempotency_key
  )
  values (
    p_event_id,
    trim(p_full_name),
    trim(p_phone),
    normalized_email,
    p_participant_count,
    nullif(trim(coalesce(p_note, '')), ''),
    p_idempotency_key
  )
  returning id into registration_id;

  update public.events
  set available_spots = available_spots - p_participant_count,
      updated_at = now()
  where id = p_event_id;

  return registration_id;
end;
$$;

revoke all on function public.register_for_event(uuid, text, text, text, integer, text, uuid) from public;
revoke all on function public.register_for_event(uuid, text, text, text, integer, text, uuid) from anon, authenticated;
grant execute on function public.register_for_event(uuid, text, text, text, integer, text, uuid) to service_role;

create or replace function public.update_event_registration_status(
  p_registration_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  registration public.event_registrations%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required';
  end if;
  if p_status not in ('new', 'confirmed', 'cancelled') then
    raise exception 'invalid_registration_status';
  end if;

  select *
  into registration
  from public.event_registrations
  where id = p_registration_id
  for update;

  if registration.id is null then
    raise exception 'registration_not_found';
  end if;
  if registration.status = p_status then
    return;
  end if;

  perform 1
  from public.events
  where id = registration.event_id
  for update;

  if registration.status <> 'cancelled' and p_status = 'cancelled' then
    update public.events
    set available_spots = case
          when available_spots is null then null
          when capacity is null then available_spots + registration.participant_count
          else least(capacity, available_spots + registration.participant_count)
        end,
        updated_at = now()
    where id = registration.event_id;
  elsif registration.status = 'cancelled' and p_status <> 'cancelled' then
    if (
      select available_spots < registration.participant_count
      from public.events
      where id = registration.event_id
    ) then
      raise exception 'not_enough_spots';
    end if;

    update public.events
    set available_spots = available_spots - registration.participant_count,
        updated_at = now()
    where id = registration.event_id;
  end if;

  update public.event_registrations
  set status = p_status,
      updated_at = now()
  where id = p_registration_id;
end;
$$;

revoke all on function public.update_event_registration_status(uuid, text) from public;
grant execute on function public.update_event_registration_status(uuid, text) to authenticated;

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

drop policy if exists "event_registrations_admin_read" on public.event_registrations;
create policy "event_registrations_admin_read"
on public.event_registrations
for select
to authenticated
using (public.is_admin(auth.uid()));
