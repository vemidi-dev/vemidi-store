import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

// Optional offline PostgreSQL verification. Install PGlite outside the project.
const modulePath = process.argv[2] || process.env.PGLITE_MODULE_PATH;
if (!modulePath) throw new Error("Pass the absolute path to @electric-sql/pglite/dist/index.js");
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$ select '00000000-0000-4000-8000-000000000001'::uuid $$;
    create function public.is_admin(uuid) returns boolean language sql as $$ select true $$;
    create table public.events (
      id uuid primary key default gen_random_uuid(), price numeric(10,2), capacity integer, available_spots integer,
      starts_at timestamptz, is_published boolean default true, registration_url text, updated_at timestamptz default now()
    );
    create table public.event_registrations (
      id uuid primary key default gen_random_uuid(), event_id uuid references public.events(id),
      full_name text, phone text, email text, participant_count integer check (participant_count between 1 and 10), note text,
      status text default 'new' check (status in ('new','confirmed','cancelled')), idempotency_key uuid unique not null,
      created_at timestamptz default now(), updated_at timestamptz default now()
    );
  `);
  const original = await readFile(new URL("../supabase/blog_and_events.sql", import.meta.url), "utf8");
  for (const name of ["register_for_event", "update_event_registration_status"]) {
    const start = original.indexOf(`create or replace function public.${name}(`);
    assert.notEqual(start, -1);
    const end = original.indexOf("$$;", start) + 3;
    await db.exec(original.slice(start, end));
  }
  const migration = await readFile(new URL("../supabase/event_registration_forms.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration);
  const mapsMigration = await readFile(new URL("../supabase/event_maps_url.sql", import.meta.url), "utf8");
  await db.exec(mapsMigration);
  await db.exec(mapsMigration);
  await db.query("select maps_url from public.events limit 0");
  const eventId = randomUUID();
  const key = randomUUID();
  const participants = [
    { name: "Child One", type: "child_with_guardian", age: 7, answers: [{ id: "shirt", label: "Size", value: "128", type: "select" }] },
    { name: "Adult Two", type: "adult", age: null, answers: [{ id: "shirt", label: "Size", value: "M", type: "select" }] },
  ];
  await db.query("insert into public.events (id,price,capacity,available_spots,starts_at) values ($1,10,8,8,now()+interval '1 day')", [eventId]);
  const submit = (idempotencyKey = key, changes = {}) => db.query(
    "select public.register_for_event_v2($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9::jsonb,$10) as id",
    [eventId, "Test Parent", "0888123456", "test@example.invalid", JSON.stringify(participants), "[]", null, idempotencyKey, changes.settings ?? "{}", changes.price ?? 10],
  );
  const getEvent = async () => (await db.query("select * from public.events where id=$1", [eventId])).rows[0];
  const registrationId = (await submit()).rows[0].id;
  const saved = (await db.query("select * from public.event_registrations where id=$1", [registrationId])).rows[0];
  assert.equal(saved.participant_count, 2);
  assert.equal(Number(saved.total_amount), 20);
  assert.deepEqual(saved.participants, participants);
  assert.equal((await getEvent()).available_spots, 6);
  assert.equal((await submit()).rows[0].id, registrationId);
  assert.equal((await getEvent()).available_spots, 6);
  await assert.rejects(submit(randomUUID(), { price: 11 }), /event_settings_changed/);
  await assert.rejects(submit(randomUUID(), { settings: '{"age":"required"}' }), /event_settings_changed/);
  assert.equal((await getEvent()).available_spots, 6);
  const status = (next) => db.query("select public.update_event_registration_status($1,$2)", [registrationId, next]);
  await status("cancelled");
  assert.equal((await getEvent()).available_spots, 8);
  await status("cancelled");
  assert.equal((await getEvent()).available_spots, 8);
  await assert.rejects(submit(), /registration_cancelled/);
  await status("confirmed");
  assert.equal((await getEvent()).available_spots, 6);
  await db.query("update events set available_spots=1 where id=$1", [eventId]);
  await assert.rejects(submit(randomUUID()), /not_enough_spots/);
  assert.equal((await getEvent()).available_spots, 1);
  assert.equal((await db.query("select count(*)::int as count from event_registrations")).rows[0].count, 1);
  await status("cancelled");
  await db.query("update events set available_spots=0 where id=$1", [eventId]);
  await assert.rejects(status("confirmed"), /not_enough_spots/);
  assert.equal((await db.query("select status from event_registrations where id=$1", [registrationId])).rows[0].status, "cancelled");
  for (const [change, expected] of [
    ["is_published=false", /event_not_found/],
    ["is_published=true,starts_at=now()-interval '1 day'", /event_has_started/],
    ["starts_at=now()+interval '1 day',registration_url='https://example.com'", /external_registration_only/],
    ["registration_url=null,available_spots=null", /registration_not_configured/],
  ]) {
    await db.query(`update events set ${change} where id=$1`, [eventId]);
    await assert.rejects(submit(randomUUID()), expected);
  }
  await db.exec("set role anon");
  await assert.rejects(submit(randomUUID()), /permission denied/);
  await db.exec("reset role");
  console.log("Offline PostgreSQL: migration repeatability, snapshots, pricing, idempotency, capacity, cancel/restore, stale settings and access checks PASS.");
} finally {
  await db.close();
}
