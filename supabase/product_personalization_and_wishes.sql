-- Run once in Supabase SQL Editor, then re-run store_checkout_orders.sql.

create table if not exists public.product_personalization_fields (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  field_key text not null,
  field_type text not null default 'text',
  placeholder text,
  max_length integer not null default 100,
  is_required boolean not null default false,
  allows_wish_templates boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_personalization_field_type_check check (field_type in ('text', 'textarea', 'date')),
  constraint product_personalization_max_length_check check (max_length between 1 and 1000),
  constraint product_personalization_unique_key unique(product_id, field_key)
);

create table if not exists public.wish_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wish_template_occasions (
  wish_template_id uuid not null references public.wish_templates(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (wish_template_id, category_id)
);

create index if not exists product_personalization_fields_product_idx
  on public.product_personalization_fields(product_id, sort_order);
create index if not exists wish_templates_active_idx
  on public.wish_templates(is_active, sort_order);

alter table public.product_personalization_fields enable row level security;
alter table public.wish_templates enable row level security;
alter table public.wish_template_occasions enable row level security;

grant select on public.product_personalization_fields to anon, authenticated;
grant select on public.wish_templates to anon, authenticated;
grant select on public.wish_template_occasions to anon, authenticated;
grant insert, update, delete on public.product_personalization_fields to authenticated;
grant insert, update, delete on public.wish_templates to authenticated;
grant insert, update, delete on public.wish_template_occasions to authenticated;

drop policy if exists "personalization_fields_public_read" on public.product_personalization_fields;
create policy "personalization_fields_public_read"
on public.product_personalization_fields for select to anon, authenticated using (true);

drop policy if exists "wish_templates_public_read" on public.wish_templates;
create policy "wish_templates_public_read"
on public.wish_templates for select to anon, authenticated
using (is_active or public.is_admin(auth.uid()));

drop policy if exists "wish_occasions_public_read" on public.wish_template_occasions;
create policy "wish_occasions_public_read"
on public.wish_template_occasions for select to anon, authenticated using (true);

drop policy if exists "personalization_fields_admin_all" on public.product_personalization_fields;
create policy "personalization_fields_admin_all"
on public.product_personalization_fields for all to authenticated
using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "wish_templates_admin_all" on public.wish_templates;
create policy "wish_templates_admin_all"
on public.wish_templates for all to authenticated
using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "wish_occasions_admin_all" on public.wish_template_occasions;
create policy "wish_occasions_admin_all"
on public.wish_template_occasions for all to authenticated
using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
