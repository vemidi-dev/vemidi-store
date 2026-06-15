-- Contract withdrawal requests (migration #38).
-- Public submissions via server-side service role only; admin read/update via RLS.
-- Safe to re-run: CREATE IF NOT EXISTS + CREATE OR REPLACE policies only.

begin;

create table if not exists public.contract_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null,
  idempotency_key uuid not null,
  order_id uuid references public.orders (id) on delete set null,
  order_number_submitted text not null,
  contact_email text,
  contact_phone text,
  customer_name text not null,
  received_at date not null,
  items_description text not null,
  statement_confirmed boolean not null default true,
  note text,
  status text not null default 'new' check (
    status in ('new', 'reviewing', 'accepted', 'rejected', 'completed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_withdrawal_requests_reference_number_key unique (reference_number),
  constraint contract_withdrawal_requests_idempotency_key_key unique (idempotency_key),
  constraint contract_withdrawal_requests_contact_check check (
    nullif(trim(coalesce(contact_email, '')), '') is not null
    or nullif(trim(coalesce(contact_phone, '')), '') is not null
  ),
  constraint contract_withdrawal_requests_statement_confirmed_check check (
    statement_confirmed = true
  )
);

create index if not exists contract_withdrawal_requests_status_created_idx
  on public.contract_withdrawal_requests (status, created_at desc);

create index if not exists contract_withdrawal_requests_order_id_idx
  on public.contract_withdrawal_requests (order_id)
  where order_id is not null;

alter table public.contract_withdrawal_requests enable row level security;

revoke all on table public.contract_withdrawal_requests from anon, authenticated;

grant select, update on table public.contract_withdrawal_requests to authenticated;

drop policy if exists "contract_withdrawal_requests_admin_select"
  on public.contract_withdrawal_requests;

create policy "contract_withdrawal_requests_admin_select"
on public.contract_withdrawal_requests
for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "contract_withdrawal_requests_admin_update"
  on public.contract_withdrawal_requests;

create policy "contract_withdrawal_requests_admin_update"
on public.contract_withdrawal_requests
for update
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

create table if not exists public.withdrawal_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  withdrawal_request_id uuid not null references public.contract_withdrawal_requests (id) on delete cascade,
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
  constraint withdrawal_notification_deliveries_request_channel_key
    unique (withdrawal_request_id, channel)
);

create index if not exists withdrawal_notification_deliveries_retry_idx
  on public.withdrawal_notification_deliveries (next_retry_at)
  where status = 'pending';

alter table public.withdrawal_notification_deliveries enable row level security;

revoke all on table public.withdrawal_notification_deliveries from anon, authenticated;

grant select on table public.withdrawal_notification_deliveries to authenticated;

drop policy if exists "withdrawal_notification_deliveries_admin_select"
  on public.withdrawal_notification_deliveries;

create policy "withdrawal_notification_deliveries_admin_select"
on public.withdrawal_notification_deliveries
for select
to authenticated
using (public.is_admin((select auth.uid())));

commit;
