-- Optional exact location for an event; existing event data stays unchanged.
alter table public.events add column if not exists maps_url text;
notify pgrst, 'reload schema';
