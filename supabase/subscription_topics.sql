-- Run once in the Supabase SQL editor.
-- Keeps one subscriber record per email with separate topic preferences:
-- blog, products and events.

alter table public.newsletter_subscribers
  add column if not exists topics text[] not null default array['blog']::text[];

alter table public.newsletter_subscribers
  alter column topics set default array['blog']::text[];

update public.newsletter_subscribers
set topics = array(
  select distinct case when topic = 'newsletter' then 'blog' else topic end
  from unnest(topics) as topic
)
where 'newsletter' = any(topics);

create or replace function public.subscribe_to_topics(
  p_email text,
  p_topics text[]
)
returns void
language plpgsql
security definer
set search_path = public
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

revoke all on function public.subscribe_to_topics(text, text[]) from public;
grant execute on function public.subscribe_to_topics(text, text[]) to anon, authenticated;

create or replace function public.subscribe_newsletter(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.subscribe_to_topics(p_email, array['blog']::text[]);
end;
$$;

revoke all on function public.subscribe_newsletter(text) from public;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;
