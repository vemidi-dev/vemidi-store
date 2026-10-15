-- Apply after event_materials_pricing.sql. No registration history is removed.
begin;
alter table public.event_registrations add column if not exists original_total_amount numeric(10,2);

create or replace function public.manage_event_registration(
  p_registration_id uuid, p_status text, p_participant_index integer default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  booking public.event_registrations%rowtype;
  workshop public.events%rowtype;
  event_id_value uuid;
  person jsonb;
  people jsonb := '[]'::jsonb;
  old_count integer := 0;
  new_count integer := 0;
  idx integer := 0;
  active boolean;
  next_status text;
  amount numeric := 0;
  original_amount numeric;
  unit_amount numeric;
  known_amount boolean := true;
begin
  if auth.uid() is null or not coalesce(public.is_admin(auth.uid()), false) then raise exception 'admin_required'; end if;
  if p_status is null or p_status not in ('new','confirmed','cancelled') then raise exception 'invalid_registration_status'; end if;
  select event_id into event_id_value from public.event_registrations where id = p_registration_id;
  if event_id_value is null then raise exception 'registration_not_found'; end if;
  -- Same event-first lock order as creating a booking, shared by all status changes.
  select * into workshop from public.events where id = event_id_value for update;
  select * into booking from public.event_registrations where id = p_registration_id for update;
  if booking.id is null then raise exception 'registration_not_found'; end if;
  if p_participant_index is not null and (p_participant_index < 0 or p_participant_index >= jsonb_array_length(booking.participants)) then raise exception 'participant_not_found'; end if;
  original_amount := case when booking.participants->0 ? 'status' then booking.original_total_amount else coalesce(booking.original_total_amount, booking.total_amount) end;
  if jsonb_array_length(booking.participants) > 0 then
    if booking.status <> 'cancelled' then
      select count(*) into old_count from jsonb_array_elements(booking.participants) p where coalesce(p->>'status','active') <> 'cancelled';
    end if;
    for person in select value from jsonb_array_elements(booking.participants) loop
      active := booking.status <> 'cancelled' and coalesce(person->>'status','active') <> 'cancelled';
      if p_participant_index is null then
        if p_status = 'cancelled' then active := false;
        elsif booking.status = 'cancelled' then active := true;
        end if;
      elsif idx = p_participant_index then active := p_status <> 'cancelled';
      end if;
      if jsonb_typeof(person->'unitPrice') = 'number' then unit_amount := (person->>'unitPrice')::numeric;
      else unit_amount := case when original_amount is null then null else original_amount / booking.participant_count end;
      end if;
      if unit_amount is not null then person := person || jsonb_build_object('unitPrice', unit_amount); else person := person - 'unitPrice'; end if;
      if active then
        new_count := new_count + 1;
        if unit_amount is null then known_amount := false; else amount := amount + unit_amount; end if;
        if coalesce(person->>'status','active') = 'cancelled' or booking.status = 'cancelled' then person := person || jsonb_build_object('restoredAt',now()); end if;
      elsif coalesce(person->>'status','active') <> 'cancelled' then person := person || jsonb_build_object('cancelledAt',now());
      end if;
      people := people || jsonb_build_array(person || jsonb_build_object('status',case when active then 'active' else 'cancelled' end));
      idx := idx + 1;
    end loop;
  else
    old_count := case when booking.status = 'cancelled' then 0 else booking.participant_count end;
    new_count := case when p_status = 'cancelled' then 0 else booking.participant_count end;
    amount := case when original_amount is null then null when new_count = 0 then 0 else original_amount end;
    known_amount := amount is not null;
  end if;
  if new_count > old_count and (workshop.available_spots is null or workshop.available_spots < new_count - old_count) then raise exception 'not_enough_spots'; end if;
  if old_count <> new_count then
    update public.events set available_spots = case when available_spots is null then null else available_spots + old_count - new_count end, updated_at = now() where id = workshop.id;
  end if;
  next_status := case when new_count = 0 then 'cancelled' when p_participant_index is null then p_status when booking.status = 'cancelled' then 'confirmed' else booking.status end;
  update public.event_registrations set participants = people, status = next_status,
    original_total_amount = original_amount, total_amount = case when known_amount then round(amount,2) else null end, updated_at = now()
    where id = booking.id returning * into booking;
  return to_jsonb(booking);
end;
$$;
revoke all on function public.manage_event_registration(uuid,text,integer) from public, anon;
grant execute on function public.manage_event_registration(uuid,text,integer) to authenticated;

-- Keep old callers atomic and compatible with partially cancelled registrations.
create or replace function public.update_event_registration_status(p_registration_id uuid,p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.manage_event_registration(p_registration_id,p_status,null);
end;
$$;
revoke all on function public.update_event_registration_status(uuid,text) from public, anon;
grant execute on function public.update_event_registration_status(uuid,text) to authenticated;
notify pgrst, 'reload schema';
commit;
