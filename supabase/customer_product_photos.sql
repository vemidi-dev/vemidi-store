-- Run after personalization_field_price_delta.sql and existing order migrations.
begin;

alter table public.product_personalization_fields
  drop constraint if exists product_personalization_field_type_check;
alter table public.product_personalization_fields
  add constraint product_personalization_field_type_check
  check (field_type in ('text', 'textarea', 'date', 'file'));

create or replace function public.replace_product_personalization_fields(p_product_id uuid, p_fields jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare v_field record; v_keys text[] := array[]::text[];
begin
  perform public.assert_admin();
  delete from public.product_personalization_fields where product_id = p_product_id;
  for v_field in select * from jsonb_to_recordset(coalesce(p_fields, '[]'::jsonb)) as field(
    label text, field_key text, field_type text, placeholder text, max_length integer,
    price_delta numeric, is_required boolean, allows_wish_templates boolean, sort_order integer
  ) loop
    if nullif(btrim(v_field.label), '') is null
      or coalesce(v_field.field_key, '') !~ '^[a-z][a-z0-9_]{0,63}$'
      or coalesce(v_field.field_type, '') not in ('text', 'textarea', 'date', 'file')
      or coalesce(v_field.max_length, 0) not between 1 and 1000
      or coalesce(v_field.price_delta, 0) < 0 or v_field.field_key = any(v_keys)
    then raise exception 'invalid_personalization_field' using errcode = '22023'; end if;
    v_keys := array_append(v_keys, v_field.field_key);
    insert into public.product_personalization_fields (
      product_id, label, field_key, field_type, placeholder, max_length, price_delta,
      is_required, allows_wish_templates, sort_order
    ) values (
      p_product_id, btrim(v_field.label), v_field.field_key, v_field.field_type,
      nullif(btrim(v_field.placeholder), ''),
      case when v_field.field_type = 'file' then 100 else v_field.max_length end,
      coalesce(v_field.price_delta, 0), coalesce(v_field.is_required, false),
      v_field.field_type = 'textarea' and coalesce(v_field.allows_wish_templates, false),
      coalesce(v_field.sort_order, 0)
    );
  end loop;
end; $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('customer-photos', 'customer-photos', false, 16777216, array['image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.customer_product_photos (
  id uuid primary key,
  product_id uuid references public.products(id) on delete set null,
  field_id uuid references public.product_personalization_fields(id) on delete set null,
  owner_hash text not null,
  storage_path text not null unique,
  original_filename text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  order_id uuid references public.orders(id) on delete set null
);
alter table public.customer_product_photos enable row level security;
revoke all on public.customer_product_photos from public, anon, authenticated;
grant select, insert, update, delete on public.customer_product_photos to service_role;
create index if not exists customer_product_photos_expiry_idx
  on public.customer_product_photos(expires_at) where order_id is null;

-- Link files in the same transaction as the order, protecting them from abandoned-file cleanup.
create or replace function public.attach_customer_photos_to_order()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_item jsonb; v_field jsonb; v_id uuid;
begin
  for v_item in select value from jsonb_array_elements(coalesce(new.raw_payload #> '{order,items}', '[]'::jsonb)) loop
    for v_field in select value from jsonb_array_elements(coalesce(v_item -> 'personalizationFields', '[]'::jsonb)) loop
      if coalesce(v_field ->> 'value', '') ~ '^upload:[0-9a-fA-F-]{36}$' then
        v_id := substring(v_field ->> 'value' from 8)::uuid;
        update public.customer_product_photos set order_id = new.id
          where id = v_id and product_id = (v_item ->> 'productId')::uuid
            and field_id = (v_field ->> 'fieldId')::uuid and expires_at > now();
        if not found then raise exception 'invalid_personalization_photo' using errcode = '22023'; end if;
      end if;
    end loop;
  end loop;
  return new;
end; $$;
revoke all on function public.attach_customer_photos_to_order() from public, anon, authenticated;
drop trigger if exists attach_customer_photos_to_order on public.orders;
create trigger attach_customer_photos_to_order after insert on public.orders
for each row execute function public.attach_customer_photos_to_order();

commit;
