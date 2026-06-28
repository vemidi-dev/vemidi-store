-- Product publication status: draft / published / archived.
-- Safe to re-run. Run before deploying app code that reads/writes products.status.
--
-- Existing products are backfilled to published.
-- New products default to draft at the database level.

begin;

alter table public.products
  add column if not exists status text;

update public.products
set status = 'published'
where status is null;

alter table public.products
  alter column status set default 'draft',
  alter column status set not null;

alter table public.products
  drop constraint if exists products_status_check;

alter table public.products
  add constraint products_status_check
  check (status in ('draft', 'published', 'archived'));

create index if not exists products_status_created_at_idx
  on public.products (status, created_at desc);

comment on column public.products.status is
  'Publication lifecycle: draft (admin only), published (storefront), archived (admin only).';

drop policy if exists "products_read_public" on public.products;

create policy "products_read_public"
on public.products
for select
to anon, authenticated
using (
  status = 'published'
  or public.is_admin(auth.uid())
);

commit;
