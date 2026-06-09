-- Run once in the Supabase SQL editor after subscription_topics.sql.
-- Allows only authenticated administrators to view and manage subscriptions.

grant select, update on public.newsletter_subscribers to authenticated;

create index if not exists newsletter_subscribers_active_updated_idx
  on public.newsletter_subscribers (is_active, updated_at desc);

create index if not exists newsletter_subscribers_topics_idx
  on public.newsletter_subscribers using gin (topics);

drop policy if exists "newsletter_subscribers_admin_read"
  on public.newsletter_subscribers;
create policy "newsletter_subscribers_admin_read"
on public.newsletter_subscribers
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "newsletter_subscribers_admin_update"
  on public.newsletter_subscribers;
create policy "newsletter_subscribers_admin_update"
on public.newsletter_subscribers
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
