-- Centralized FAQ library: groups, reusable items, and product associations.
-- Safe to re-run. Does not seed example FAQ content.
-- Run before deploying app code that reads faq_* tables.

begin;

create table if not exists public.faq_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  scope text not null default 'product',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faq_groups_name_check check (nullif(btrim(name), '') is not null),
  constraint faq_groups_slug_check check (nullif(btrim(slug), '') is not null),
  constraint faq_groups_scope_check check (scope in ('global', 'product')),
  constraint faq_groups_sort_order_check check (sort_order >= 0),
  constraint faq_groups_slug_unique unique (slug)
);

create table if not exists public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faq_items_question_check check (nullif(btrim(question), '') is not null),
  constraint faq_items_answer_check check (nullif(btrim(answer), '') is not null),
  constraint faq_items_sort_order_check check (sort_order >= 0)
);

create table if not exists public.faq_group_items (
  group_id uuid not null references public.faq_groups (id) on delete cascade,
  faq_item_id uuid not null references public.faq_items (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint faq_group_items_sort_order_check check (sort_order >= 0),
  constraint faq_group_items_pkey primary key (group_id, faq_item_id)
);

create table if not exists public.product_faq_groups (
  product_id uuid not null references public.products (id) on delete cascade,
  group_id uuid not null references public.faq_groups (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_faq_groups_sort_order_check check (sort_order >= 0),
  constraint product_faq_groups_pkey primary key (product_id, group_id)
);

create table if not exists public.product_faq_items (
  product_id uuid not null references public.products (id) on delete cascade,
  faq_item_id uuid not null references public.faq_items (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_faq_items_sort_order_check check (sort_order >= 0),
  constraint product_faq_items_pkey primary key (product_id, faq_item_id)
);

create index if not exists faq_groups_storefront_idx
  on public.faq_groups (scope, is_active, sort_order, id);

create index if not exists faq_items_storefront_idx
  on public.faq_items (is_active, sort_order, id);

create index if not exists faq_group_items_group_sort_idx
  on public.faq_group_items (group_id, sort_order, faq_item_id);

create index if not exists product_faq_groups_product_sort_idx
  on public.product_faq_groups (product_id, sort_order, group_id);

create index if not exists product_faq_items_product_sort_idx
  on public.product_faq_items (product_id, sort_order, faq_item_id);

drop trigger if exists faq_groups_set_updated_at on public.faq_groups;
create trigger faq_groups_set_updated_at
before update on public.faq_groups
for each row
execute function public.set_updated_at();

drop trigger if exists faq_items_set_updated_at on public.faq_items;
create trigger faq_items_set_updated_at
before update on public.faq_items
for each row
execute function public.set_updated_at();

alter table public.faq_groups enable row level security;
alter table public.faq_items enable row level security;
alter table public.faq_group_items enable row level security;
alter table public.product_faq_groups enable row level security;
alter table public.product_faq_items enable row level security;

grant select on public.faq_groups to anon, authenticated;
grant select on public.faq_items to anon, authenticated;
grant select on public.faq_group_items to anon, authenticated;
grant select on public.product_faq_groups to anon, authenticated;
grant select on public.product_faq_items to anon, authenticated;

grant insert, update, delete on public.faq_groups to authenticated;
grant insert, update, delete on public.faq_items to authenticated;
grant insert, update, delete on public.faq_group_items to authenticated;
grant insert, update, delete on public.product_faq_groups to authenticated;
grant insert, update, delete on public.product_faq_items to authenticated;

drop policy if exists "faq_groups_public_read" on public.faq_groups;
create policy "faq_groups_public_read"
on public.faq_groups
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "faq_groups_admin_read" on public.faq_groups;
create policy "faq_groups_admin_read"
on public.faq_groups
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "faq_groups_admin_write" on public.faq_groups;
create policy "faq_groups_admin_write"
on public.faq_groups
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "faq_items_public_read" on public.faq_items;
create policy "faq_items_public_read"
on public.faq_items
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "faq_items_admin_read" on public.faq_items;
create policy "faq_items_admin_read"
on public.faq_items
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "faq_items_admin_write" on public.faq_items;
create policy "faq_items_admin_write"
on public.faq_items
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "faq_group_items_public_read" on public.faq_group_items;
create policy "faq_group_items_public_read"
on public.faq_group_items
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.faq_groups g
    join public.faq_items i on i.id = faq_item_id
    where g.id = group_id
      and g.is_active = true
      and i.is_active = true
  )
);

drop policy if exists "faq_group_items_admin_read" on public.faq_group_items;
create policy "faq_group_items_admin_read"
on public.faq_group_items
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "faq_group_items_admin_write" on public.faq_group_items;
create policy "faq_group_items_admin_write"
on public.faq_group_items
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "product_faq_groups_public_read" on public.product_faq_groups;
create policy "product_faq_groups_public_read"
on public.product_faq_groups
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.faq_groups g
    where g.id = group_id
      and g.is_active = true
      and g.scope = 'product'
  )
);

drop policy if exists "product_faq_groups_admin_read" on public.product_faq_groups;
create policy "product_faq_groups_admin_read"
on public.product_faq_groups
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "product_faq_groups_admin_write" on public.product_faq_groups;
create policy "product_faq_groups_admin_write"
on public.product_faq_groups
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "product_faq_items_public_read" on public.product_faq_items;
create policy "product_faq_items_public_read"
on public.product_faq_items
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.faq_items i
    where i.id = faq_item_id
      and i.is_active = true
  )
);

drop policy if exists "product_faq_items_admin_read" on public.product_faq_items;
create policy "product_faq_items_admin_read"
on public.product_faq_items
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "product_faq_items_admin_write" on public.product_faq_items;
create policy "product_faq_items_admin_write"
on public.product_faq_items
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

notify pgrst, 'reload schema';

commit;
