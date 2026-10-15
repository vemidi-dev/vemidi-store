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
  const pricingMigration = await readFile(new URL("../supabase/event_materials_pricing.sql", import.meta.url), "utf8");
  await db.exec(pricingMigration);
  await db.exec(pricingMigration);
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
  const pricedEventId = randomUUID();
  const pricingKey = randomUUID();
  const pricingSettings = { allowedTypes: ["child", "adult", "child_with_guardian"], age: "optional", questions: [], materialsPricing: { studio: { price: 18, materials: "Studio materials" }, home: { price: 12.5, materials: "Bring a cotton shirt" } } };
  await db.query("insert into events (id,price,capacity,available_spots,starts_at,registration_settings) values ($1,12.5,8,8,now()+interval '1 day',$2::jsonb)", [pricedEventId, JSON.stringify(pricingSettings)]);
  const selected = participants.map((person, index) => ({ ...person, materialsOption: index ? "home" : "studio", unitPrice: 0.01, materialsLabel: "Forged", materialsText: "Forged" }));
  const submitPricing = (key = pricingKey, people = selected, settings = pricingSettings, price = 12.5) => db.query("select public.register_for_event_v3($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9::jsonb,$10) as id", [pricedEventId, "Test Parent", "0888123456", "test@example.invalid", JSON.stringify(people), "[]", null, key, JSON.stringify(settings), price]);
  const pricedId = (await submitPricing()).rows[0].id;
  const priced = (await db.query("select * from event_registrations where id=$1", [pricedId])).rows[0];
  assert.equal(Number(priced.total_amount), 30.5);
  assert.equal(priced.participant_count, 2);
  assert.deepEqual(priced.participants.map((person) => person.unitPrice), [18, 12.5]);
  assert.deepEqual(priced.participants.map((person) => person.materialsText), ["Studio materials", "Bring a cotton shirt"]);
  assert.notEqual(priced.participants[0].materialsLabel, "Forged");
  assert.equal((await submitPricing()).rows[0].id, pricedId);
  assert.equal((await db.query("select available_spots from events where id=$1", [pricedEventId])).rows[0].available_spots, 6);
  await assert.rejects(submitPricing(randomUUID(), [{ ...selected[0], materialsOption: "cheap" }]), /invalid_materials_option/);
  await assert.rejects(submitPricing(randomUUID(), [{ ...selected[0], materialsOption: null }]), /invalid_materials_option/);
  await assert.rejects(submitPricing(randomUUID(), selected, { ...pricingSettings, age: "required" }), /event_settings_changed/);
  await assert.rejects(submitPricing(randomUUID(), selected, pricingSettings, 0.01), /event_settings_changed/);
  assert.equal((await db.query("select available_spots from events where id=$1", [pricedEventId])).rows[0].available_spots, 6);
  await db.query("select public.update_event_registration_status($1,'cancelled')", [pricedId]);
  assert.equal((await db.query("select available_spots from events where id=$1", [pricedEventId])).rows[0].available_spots, 8);
  await db.query("select public.update_event_registration_status($1,'confirmed')", [pricedId]);
  assert.equal((await db.query("select available_spots from events where id=$1", [pricedEventId])).rows[0].available_spots, 6);
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(submitPricing(randomUUID()), /permission denied/);
    await db.exec("reset role");
  }
  console.log("Offline PostgreSQL: materials pricing, authoritative snapshots, mixed total, retries, stale price/config, cancel/restore and access checks PASS.");
  const managementMigration = await readFile(new URL("../supabase/event_participant_management.sql", import.meta.url), "utf8");
  await db.exec(managementMigration);
  await db.exec(managementMigration);
  const manage = (status, index = null) => db.query("select public.manage_event_registration($1,$2,$3) as booking", [pricedId, status, index]).then(result => result.rows[0].booking);
  const spots = async () => (await db.query("select available_spots from events where id=$1", [pricedEventId])).rows[0].available_spots;
  let updated = await manage("cancelled", 0);
  assert.equal(updated.status, "confirmed"); assert.equal(Number(updated.total_amount), 12.5); assert.equal(await spots(), 7);
  assert.equal(updated.participants[0].status, "cancelled"); assert.equal(updated.participants[1].status, "active");
  assert.ok(updated.participants[0].cancelledAt);
  await manage("cancelled", 0); assert.equal(await spots(), 7);
  await db.query("update events set available_spots=0 where id=$1", [pricedEventId]);
  await assert.rejects(manage("confirmed", 0), /not_enough_spots/);
  assert.equal((await db.query("select total_amount from event_registrations where id=$1", [pricedId])).rows[0].total_amount, "12.50");
  await db.query("update events set available_spots=7 where id=$1", [pricedEventId]);
  updated = await manage("confirmed", 0);
  assert.equal(Number(updated.total_amount), 30.5); assert.equal(await spots(), 6); assert.ok(updated.participants[0].restoredAt);
  await manage("cancelled", 1);
  updated = await manage("cancelled", 0);
  assert.equal(updated.status, "cancelled"); assert.equal(Number(updated.total_amount), 0); assert.equal(await spots(), 8);
  updated = await manage("confirmed", 1);
  assert.equal(updated.status, "confirmed"); assert.equal(Number(updated.total_amount), 12.5); assert.equal(await spots(), 7);
  assert.equal(updated.participants[0].status, "cancelled");
  // Legacy whole-booking caller must release only the remaining active seat.
  await db.query("select public.update_event_registration_status($1,'cancelled')", [pricedId]);
  assert.equal(await spots(), 8);
  updated = await manage("confirmed");
  assert.equal(Number(updated.total_amount), 30.5); assert.equal(await spots(), 6);
  await manage("confirmed"); assert.equal(await spots(), 6);
  await assert.rejects(manage("cancelled", -1), /participant_not_found/);
  await assert.rejects(manage("cancelled", 2), /participant_not_found/);
  // Stored prices, not the current workshop prices, govern restoration.
  await manage("cancelled", 0);
  await db.query("update events set price=99 where id=$1", [pricedEventId]);
  updated = await manage("confirmed", 0); assert.equal(Number(updated.total_amount), 30.5);
  // Old single-price booking without unit snapshots also retains its original price.
  await db.query("update events set available_spots=8, price=99 where id=$1", [eventId]);
  await status("confirmed");
  assert.equal(Number((await db.query("select total_amount from event_registrations where id=$1", [registrationId])).rows[0].total_amount), 20);
  await db.exec("set role anon"); await assert.rejects(manage("cancelled", 0), /permission denied/); await db.exec("reset role");
  // Legacy rows with no named participants retain totals through full cancel/restore.
  const legacyId = randomUUID();
  await db.query("insert into event_registrations(id,event_id,participant_count,total_amount,idempotency_key) values ($1,$2,2,14.6,$3)", [legacyId, pricedEventId, randomUUID()]);
  await db.query("update events set available_spots=4 where id=$1", [pricedEventId]);
  await db.query("select manage_event_registration($1,'cancelled',null)", [legacyId]);
  assert.equal(await spots(), 6);
  await db.query("select manage_event_registration($1,'confirmed',null)", [legacyId]);
  assert.equal(await spots(), 4);
  assert.equal(Number((await db.query("select total_amount from event_registrations where id=$1", [legacyId])).rows[0].total_amount), 14.6);
  await assert.rejects(db.query("select manage_event_registration($1,'cancelled',0)", [legacyId]), /participant_not_found/);
  await assert.rejects(manage("invalid", 0), /invalid_registration_status/);
  const unknownPriceId = randomUUID();
  await db.query("insert into event_registrations(id,event_id,participant_count,participants,idempotency_key) values ($1,$2,2,$3::jsonb,$4)", [unknownPriceId, pricedEventId, JSON.stringify(participants), randomUUID()]);
  await db.query("update events set available_spots=2 where id=$1", [pricedEventId]);
  await db.query("select manage_event_registration($1,'cancelled',null)", [unknownPriceId]);
  await db.query("select manage_event_registration($1,'confirmed',null)", [unknownPriceId]);
  const unknownPrice = (await db.query("select total_amount,original_total_amount,participants from event_registrations where id=$1", [unknownPriceId])).rows[0];
  assert.equal(unknownPrice.total_amount, null); assert.equal(unknownPrice.original_total_amount, null);
  assert.deepEqual(unknownPrice.participants.map(person => person.unitPrice), [undefined, undefined]);
  await db.exec("create or replace function public.is_admin(uuid) returns boolean language sql as $$ select false $$");
  await db.exec("set role authenticated"); await assert.rejects(manage("cancelled", 0), /admin_required/); await db.exec("reset role");
  console.log("Offline PostgreSQL: participant-only cancellation/restoration, mixed prices, retries, full cancellation, last seat, capacity rollback, original prices and admin access PASS.");
  console.log("Offline PostgreSQL: migration repeatability, snapshots, pricing, idempotency, capacity, cancel/restore, stale settings and access checks PASS.");
} finally {
  await db.close();
}
