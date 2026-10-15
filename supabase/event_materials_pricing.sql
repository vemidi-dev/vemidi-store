-- Apply after event_registration_forms.sql. Additive: existing RPCs and bookings remain unchanged.
begin;

create or replace function public.register_for_event_v3(
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
  participant jsonb;
  trusted_participants jsonb := '[]'::jsonb;
  option_key text;
  pricing_option jsonb;
  unit_price numeric;
  payable_total numeric := 0;
  has_materials_pricing boolean;
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
  if jsonb_typeof(p_participants) is distinct from 'array' then raise exception 'invalid_participants'; end if;
  if jsonb_array_length(p_participants) not between 1 and 10 then raise exception 'invalid_participant_count'; end if;
  has_materials_pricing := target_event.registration_settings ? 'materialsPricing';
  if has_materials_pricing and jsonb_typeof(target_event.registration_settings->'materialsPricing') is distinct from 'object' then raise exception 'invalid_materials_pricing'; end if;

  for participant in select value from jsonb_array_elements(p_participants) loop
    if jsonb_typeof(participant) is distinct from 'object' then raise exception 'invalid_participants'; end if;
    option_key := participant->>'materialsOption';
    participant := participant - 'materialsOption' - 'materialsLabel' - 'materialsText' - 'unitPrice';
    if has_materials_pricing then
      if option_key is null or option_key not in ('studio', 'home') then raise exception 'invalid_materials_option'; end if;
      pricing_option := target_event.registration_settings->'materialsPricing'->option_key;
      if jsonb_typeof(pricing_option->'price') is distinct from 'number'
        or jsonb_typeof(pricing_option->'materials') is distinct from 'string'
        or char_length(trim(pricing_option->>'materials')) not between 1 and 1000 then raise exception 'invalid_materials_pricing'; end if;
      unit_price := (pricing_option->>'price')::numeric;
      if unit_price < 0 or unit_price > 999999.99 or unit_price <> round(unit_price, 2) then raise exception 'invalid_materials_pricing'; end if;
      participant := participant || jsonb_build_object(
        'materialsOption', option_key,
        'materialsLabel', case when option_key = 'studio' then 'Материали от ателието' else 'Материали от вкъщи' end,
        'materialsText', trim(pricing_option->>'materials'),
        'unitPrice', unit_price
      );
      payable_total := payable_total + unit_price;
    end if;
    trusted_participants := trusted_participants || jsonb_build_array(participant);
  end loop;

  -- Existing v2 still owns the publication, capacity, email and participant checks.
  registration_id := public.register_for_event_v2(p_event_id, p_full_name, p_phone, p_email, trusted_participants, p_answers, p_note, p_idempotency_key, p_expected_settings, p_expected_price);
  if has_materials_pricing then
    update public.event_registrations set total_amount = payable_total where id = registration_id;
  end if;
  return registration_id;
end;
$$;

revoke all on function public.register_for_event_v3(uuid,text,text,text,jsonb,jsonb,text,uuid,jsonb,numeric) from public, anon, authenticated;
grant execute on function public.register_for_event_v3(uuid,text,text,text,jsonb,jsonb,text,uuid,jsonb,numeric) to service_role;

notify pgrst, 'reload schema';
commit;
