-- Apply after event_participant_management.sql. No existing records are deleted.
begin;

-- Keep only an opaque request token, never contact or participant data.
-- A stale registration form must not recreate a permanently deleted booking.
create table if not exists public.event_registration_tombstones (
  idempotency_key uuid primary key,
  deleted_at timestamptz not null default now()
);
alter table public.event_registration_tombstones enable row level security;
revoke all on public.event_registration_tombstones from public, anon, authenticated;

create or replace function public.reject_deleted_event_registration()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.event_registration_tombstones where idempotency_key = new.idempotency_key) then raise exception 'registration_cancelled'; end if;
  return new;
end;
$$;
revoke all on function public.reject_deleted_event_registration() from public, anon, authenticated;
drop trigger if exists reject_deleted_event_registration on public.event_registrations;
create trigger reject_deleted_event_registration before insert on public.event_registrations for each row execute function public.reject_deleted_event_registration();

-- Check the booking version before using an array index that may have shifted.
create or replace function public.manage_event_registration_checked(
  p_registration_id uuid, p_status text, p_participant_index integer, p_expected_updated_at timestamptz
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  event_id_value uuid;
  booking public.event_registrations%rowtype;
begin
  if auth.uid() is null or not coalesce(public.is_admin(auth.uid()),false) then raise exception 'admin_required'; end if;
  select event_id into event_id_value from public.event_registrations where id = p_registration_id;
  if event_id_value is null then raise exception 'registration_not_found'; end if;
  perform 1 from public.events where id = event_id_value for update;
  select * into booking from public.event_registrations where id = p_registration_id for update;
  if booking.id is null then raise exception 'registration_not_found'; end if;
  if p_expected_updated_at is null or booking.updated_at is distinct from p_expected_updated_at then raise exception 'registration_changed'; end if;
  return public.manage_event_registration(p_registration_id,p_status,p_participant_index);
end;
$$;
revoke all on function public.manage_event_registration_checked(uuid,text,integer,timestamptz) from public, anon;
grant execute on function public.manage_event_registration_checked(uuid,text,integer,timestamptz) to authenticated;

create or replace function public.delete_event_registration(
  p_registration_id uuid, p_participant_index integer, p_expected_updated_at timestamptz
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  event_id_value uuid;
  booking public.event_registrations%rowtype;
  person jsonb;
  people jsonb := '[]'::jsonb;
  idx integer := 0;
  original_amount numeric;
  remaining_amount numeric := 0;
  unit_amount numeric;
  known_amount boolean := true;
begin
  if auth.uid() is null or not coalesce(public.is_admin(auth.uid()),false) then raise exception 'admin_required'; end if;
  select event_id into event_id_value from public.event_registrations where id = p_registration_id;
  if event_id_value is null then raise exception 'registration_not_found'; end if;
  perform 1 from public.events where id = event_id_value for update;
  select * into booking from public.event_registrations where id = p_registration_id for update;
  if booking.id is null then raise exception 'registration_not_found'; end if;
  if p_expected_updated_at is null or booking.updated_at is distinct from p_expected_updated_at then raise exception 'registration_changed'; end if;
  if p_participant_index is null then
    if booking.status <> 'cancelled' then raise exception 'cancel_before_delete'; end if;
  else
    if p_participant_index < 0 or p_participant_index >= jsonb_array_length(booking.participants) then raise exception 'participant_not_found'; end if;
    if booking.status <> 'cancelled' and coalesce(booking.participants->p_participant_index->>'status','active') <> 'cancelled' then raise exception 'cancel_before_delete'; end if;
    original_amount := case when booking.participants->0 ? 'status' then booking.original_total_amount else coalesce(booking.original_total_amount,booking.total_amount) end;
    for person in select value from jsonb_array_elements(booking.participants) loop
      if idx <> p_participant_index then
        unit_amount := case when jsonb_typeof(person->'unitPrice') = 'number' then (person->>'unitPrice')::numeric when original_amount is not null then original_amount / booking.participant_count else null end;
        if unit_amount is not null then person := person || jsonb_build_object('unitPrice',unit_amount); remaining_amount := remaining_amount + unit_amount;
        else known_amount := false;
        end if;
        person := person || jsonb_build_object('status',case when booking.status = 'cancelled' then 'cancelled' else coalesce(person->>'status','active') end);
        people := people || jsonb_build_array(person);
      end if;
      idx := idx + 1;
    end loop;
    if jsonb_array_length(people) > 0 then
      update public.event_registrations set participants = people, participant_count = jsonb_array_length(people),
        original_total_amount = case when known_amount then round(remaining_amount,2) else null end,
        total_amount = case when status = 'cancelled' then 0 else total_amount end, updated_at = clock_timestamp()
        where id = booking.id returning * into booking;
      return jsonb_build_object('registration',to_jsonb(booking));
    end if;
  end if;
  -- Only cancelled seats are deleted: capacity was already released on cancellation.
  insert into public.event_registration_tombstones(idempotency_key) values (booking.idempotency_key) on conflict do nothing;
  delete from public.event_registrations where id = booking.id;
  return jsonb_build_object('deletedId',booking.id);
end;
$$;
revoke all on function public.delete_event_registration(uuid,integer,timestamptz) from public, anon;
grant execute on function public.delete_event_registration(uuid,integer,timestamptz) to authenticated;
notify pgrst, 'reload schema';
commit;
