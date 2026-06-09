-- Phase 1: run before deploying the application code that calls
-- subscribe_to_topics_server. Existing public subscription forms keep working.

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    uid is not null
    and uid = auth.uid()
    and exists (
      select 1
      from public.admin_users as administrator
      where administrator.user_id = uid
    );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;

create or replace function public.subscribe_to_topics_server(
  p_email text,
  p_topics text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(p_email));
  normalized_topics text[];
begin
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email';
  end if;

  select array_agg(distinct topic)
  into normalized_topics
  from unnest(coalesce(p_topics, array[]::text[])) as topic
  where topic in ('blog', 'products', 'events');

  if coalesce(cardinality(normalized_topics), 0) = 0 then
    raise exception 'Invalid topics';
  end if;

  insert into public.newsletter_subscribers as subscribers (
    email,
    topics,
    is_active,
    updated_at
  )
  values (normalized_email, normalized_topics, true, now())
  on conflict (email)
  do update set
    topics = (
      select array_agg(distinct topic)
      from unnest(subscribers.topics || excluded.topics) as topic
    ),
    is_active = true,
    updated_at = now();
end;
$$;

revoke all on function public.subscribe_to_topics_server(text, text[]) from public;
revoke all on function public.subscribe_to_topics_server(text, text[]) from anon;
revoke all on function public.subscribe_to_topics_server(text, text[]) from authenticated;
grant execute on function public.subscribe_to_topics_server(text, text[]) to service_role;

update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'product-images';
