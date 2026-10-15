-- Run once in Supabase SQL Editor after blog_and_events.sql.
-- Existing registrations and the legacy RPC remain compatible.
begin;

alter table public.events add column if not exists registration_settings jsonb not null default '{}'::jsonb;
alter table public.events add column if not exists gallery_images jsonb not null default '[]'::jsonb;
alter table public.event_registrations add column if not exists participants jsonb not null default '[]'::jsonb;
alter table public.event_registrations add column if not exists registration_answers jsonb not null default '[]'::jsonb;
alter table public.event_registrations add column if not exists total_amount numeric(10,2);

create or replace function public.register_for_event_v2(
  p_event_id uuid, p_full_name text, p_phone text, p_email text,
  p_participants jsonb, p_answers jsonb, p_note text, p_idempotency_key uuid,
  p_expected_settings jsonb, p_expected_price numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events%rowtype;
  existing_registration public.event_registrations%rowtype;
  registration_id uuid;
  seat_count integer;
  participant jsonb;
  allowed_types jsonb;
begin
  if p_idempotency_key is null then raise exception 'invalid_registration'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
  select * into existing_registration from public.event_registrations where idempotency_key = p_idempotency_key;
  if existing_registration.id is not null then
    if existing_registration.event_id <> p_event_id or existing_registration.email is distinct from lower(trim(p_email)) then raise exception 'invalid_registration'; end if;
    if existing_registration.status = 'cancelled' then raise exception 'registration_cancelled'; end if;
    return existing_registration.id;
  end if;

  select * into target_event from public.events where id = p_event_id for update;
  if target_event.id is null then raise exception 'event_not_found'; end if;
  if target_event.registration_settings is distinct from coalesce(p_expected_settings, '{}'::jsonb)
    or target_event.price is distinct from p_expected_price then raise exception 'event_settings_changed'; end if;
  if nullif(trim(p_email), '') is null then raise exception 'invalid_email'; end if;
  if jsonb_typeof(p_participants) is distinct from 'array' or jsonb_typeof(p_answers) is distinct from 'array' then raise exception 'invalid_participants'; end if;
  seat_count := jsonb_array_length(p_participants);
  if seat_count not between 1 and 10 then raise exception 'invalid_participant_count'; end if;
  allowed_types := coalesce(target_event.registration_settings->'allowedTypes', '["child","adult","child_with_guardian"]'::jsonb);
  for participant in select value from jsonb_array_elements(p_participants) loop
    if jsonb_typeof(participant) is distinct from 'object'
      or coalesce(char_length(trim(participant->>'name')), 0) not between 2 and 120
      or participant->>'type' is null
      or not (allowed_types ? (participant->>'type'))
      or jsonb_typeof(participant->'answers') is distinct from 'array' then raise exception 'invalid_participants'; end if;
  end loop;

  -- Reuse the established atomic availability and publication checks.
  registration_id := public.register_for_event(p_event_id, p_full_name, p_phone, p_email, seat_count, p_note, p_idempotency_key);
  update public.event_registrations
  set participants = p_participants, registration_answers = p_answers,
      total_amount = case when target_event.price is null then null else target_event.price * seat_count end
  where id = registration_id;
  return registration_id;
end;
$$;

revoke all on function public.register_for_event_v2(uuid,text,text,text,jsonb,jsonb,text,uuid,jsonb,numeric) from public, anon, authenticated;
grant execute on function public.register_for_event_v2(uuid,text,text,text,jsonb,jsonb,text,uuid,jsonb,numeric) to service_role;

commit;
