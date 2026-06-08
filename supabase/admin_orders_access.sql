-- Allow only users listed in public.admin_users to read orders and change their status.
-- Run after supabase/admin_auth.sql and the landing page supabase/schema.sql.

alter table public.orders enable row level security;

grant select on table public.orders to authenticated;
grant update (status) on table public.orders to authenticated;

drop policy if exists "orders_select_admin_only" on public.orders;
create policy "orders_select_admin_only"
on public.orders
for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "orders_update_admin_only" on public.orders;
create policy "orders_update_admin_only"
on public.orders
for update
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));
