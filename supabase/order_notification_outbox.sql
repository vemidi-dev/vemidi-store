-- Order email notification outbox (migration #37).
-- Durable retry for admin/customer order emails without duplicating orders or emails.
-- Safe to re-run: CREATE IF NOT EXISTS + CREATE OR REPLACE policies only.

begin;

create table if not exists public.order_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  channel text not null check (channel in ('admin', 'customer')),
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'skipped', 'failed')
  ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  next_retry_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_notification_deliveries_order_channel_key unique (order_id, channel)
);

create index if not exists order_notification_deliveries_retry_idx
  on public.order_notification_deliveries (next_retry_at)
  where status = 'pending';

create index if not exists order_notification_deliveries_order_id_idx
  on public.order_notification_deliveries (order_id);

alter table public.order_notification_deliveries enable row level security;

revoke all on table public.order_notification_deliveries from anon, authenticated;

-- Writes are service-role only (bypasses RLS). Admins may read via policy below.
grant select on table public.order_notification_deliveries to authenticated;

drop policy if exists "order_notification_deliveries_admin_select"
  on public.order_notification_deliveries;

create policy "order_notification_deliveries_admin_select"
on public.order_notification_deliveries
for select
to authenticated
using (public.is_admin((select auth.uid())));

commit;
