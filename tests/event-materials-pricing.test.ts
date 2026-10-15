import assert from "node:assert/strict";
import test from "node:test";
import { buildCustomerEventRegistrationEmail } from "@/lib/events/event-registration-email";
import { defaultEventRegistrationSettings, parseEventRegistrationSettings, validateEventParticipants } from "@/lib/events/registration-config";
import { calculateEventParticipantTotal, formatEventPrice, parseEventMaterialsPricing, type EventMaterialsPricing } from "@/lib/events/pricing";
import { eventPreparationSummary } from "@/lib/admin/event-registrations";
import { prepareEventFormExtensions } from "@/lib/admin/event-form-extensions";
import { buildEventSchema } from "@/lib/seo/event-schema";
import type { EventRow, EventRegistrationRow } from "@/lib/admin/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const materialsPricing: EventMaterialsPricing = { studio: { price: 18, materials: "Тениска, бои и четки от ателието." }, home: { price: 12.5, materials: "Носете своя памучна тениска. Боите са включени." } };
const settings = { ...defaultEventRegistrationSettings, materialsPricing };
const participant = { name: "Анна", type: "child_with_guardian", age: 7, answers: {}, materialsOption: "studio" };

test("single price stays unchanged while two prices display exact alternatives", () => {
  assert.equal(formatEventPrice({ price: 10 })?.replace(/\u00a0/g, " "), "10,00 €");
  assert.equal(formatEventPrice({ price: null }), null);
  assert.equal(formatEventPrice({ price: 12.5, registration_settings: settings })?.replace(/\u00a0/g, " "), "18,00 € / 12,50 €");
  assert.equal(formatEventPrice({ price: null, registration_settings: settings })?.replace(/\u00a0/g, " "), "18,00 € / 12,50 €");
});
test("free price text preserves lines without changing participant totals or numeric offers", () => {
  const displayText = "18 € с материали\n12,50 € със своя тениска";
  const customSettings = { ...settings, materialsPricing: { ...materialsPricing, displayText } };
  assert.equal(parseEventRegistrationSettings(customSettings).settings.materialsPricing?.displayText, displayText);
  assert.equal(formatEventPrice({ price: 12.5, registration_settings: customSettings }), displayText);
  assert.equal(validateEventParticipants([participant], {}, customSettings, 12.5).totalAmount, 18);
  assert.equal(parseEventMaterialsPricing({ ...materialsPricing, displayText: "  " }).displayText, undefined);
  assert.equal(formatEventPrice({ price: 12.5, registration_settings: { ...settings, materialsPricing: { ...materialsPricing, displayText: " " } } })?.replace(/\u00a0/g, " "), "18,00 € / 12,50 €");
  for (const invalid of [12, null, "x".repeat(161)]) assert.throws(() => parseEventMaterialsPricing({ ...materialsPricing, displayText: invalid }));
});
test("pricing requires two cent-precise nonnegative prices and material descriptions", () => {
  assert.deepEqual(parseEventRegistrationSettings(settings).settings.materialsPricing, materialsPricing);
  for (const studio of [{ price: -1, materials: "Text" }, { price: "18", materials: "Text" }, { price: 1.111, materials: "Text" }, { price: 18, materials: " " }, { price: null, materials: "Text" }]) {
    assert.throws(() => parseEventMaterialsPricing({ ...materialsPricing, studio }));
  }
  assert.throws(() => parseEventMaterialsPricing({ studio: materialsPricing.studio }));
  assert.equal(parseEventMaterialsPricing({ ...materialsPricing, home: { price: 0, materials: "Own materials" } }).home.price, 0);
});
test("multiline price text supports longer descriptions in both pricing modes", async () => {
  const priceDisplayText = "16 € с материали от ателието\n12 € със своя тениска\n" + "Допълнителна информация. ".repeat(10);
  for (const config of [defaultEventRegistrationSettings, settings]) {
    const result = parseEventRegistrationSettings({ ...config, priceDisplayText });
    assert.equal(result.error, undefined);
    assert.equal(result.settings.priceDisplayText, priceDisplayText.trim());
    assert.equal(formatEventPrice({ price: 10, registration_settings: result.settings }), priceDisplayText.trim());
    const form = new FormData();
    form.set("registration_settings", JSON.stringify(result.settings));
    const saved = await prepareEventFormExtensions({} as SupabaseClient, form, "Workshop");
    assert.deepEqual(saved.row.registration_settings, result.settings);
  }
  assert.ok(parseEventRegistrationSettings({ ...settings, priceDisplayText: "x".repeat(1001) }).error);
  assert.ok(parseEventRegistrationSettings({ ...settings, priceDisplayText: 12 }).error);
  assert.equal(parseEventRegistrationSettings({ ...settings, priceDisplayText: " " }).settings.priceDisplayText, undefined);
  assert.equal(calculateEventParticipantTotal([undefined], undefined, 10), 10);
});
test("mixed materials reserve one seat per participant, not per guardian", () => {
  const result = validateEventParticipants([participant, { ...participant, name: "Иван", type: "adult", materialsOption: "home" }], {}, settings, 12.5);
  assert.equal(result.seats, 2);
  assert.equal(result.guardians, 1);
  assert.equal(result.totalAmount, 30.5);
  assert.equal(result.participants[0].unitPrice, 18);
  assert.equal(result.participants[1].materialsText, materialsPricing.home.materials);
});
test("participant prices and descriptions come only from saved settings", () => {
  const result = validateEventParticipants([{ ...participant, unitPrice: 0.01, materialsLabel: "Forged", materialsText: "Forged" }], {}, settings, 0);
  assert.equal(result.totalAmount, 18);
  assert.equal(result.participants[0].unitPrice, 18);
  assert.equal(result.participants[0].materialsLabel, "Материали от ателието");
  assert.equal(result.participants[0].materialsText, materialsPricing.studio.materials);
  assert.throws(() => validateEventParticipants([{ ...participant, materialsOption: "" }], {}, settings, 12.5), /Изберете материали/);
  assert.throws(() => validateEventParticipants([{ ...participant, materialsOption: "cheap" }], {}, settings, 12.5), /Изберете материали/);
});
test("unselected materials produce no misleading total; exact cents are summed", () => {
  assert.equal(calculateEventParticipantTotal(["studio", undefined], materialsPricing, 12.5), null);
  assert.equal(calculateEventParticipantTotal(["home", "home"], materialsPricing, 18), 25);
  assert.equal(calculateEventParticipantTotal([undefined, undefined], undefined, 7.3), 14.6);
  const pricing = { ...materialsPricing, home: { price: 0.1, materials: "Text" }, studio: { price: 0.2, materials: "Text" } };
  assert.equal(calculateEventParticipantTotal(["studio", "home"], pricing, null), 0.3);
});
test("switching back to one price discards client material snapshots", () => {
  const result = validateEventParticipants([{ ...participant, unitPrice: 0.01, materialsText: "Forged" }], {}, defaultEventRegistrationSettings, 10);
  assert.equal(result.totalAmount, 10);
  assert.equal(result.participants[0].materialsOption, undefined);
  assert.equal(result.participants[0].unitPrice, undefined);
});
test("admin stores the minimum as base price alongside the two-price configuration", async () => {
  const form = new FormData();
  form.set("registration_settings", JSON.stringify(settings));
  const result = await prepareEventFormExtensions({} as SupabaseClient, form, "Workshop");
  assert.equal(result.row.price, 12.5);
  assert.deepEqual(result.row.registration_settings, settings);
});
test("emails include the chosen materials, saved participant prices and mixed total", () => {
  const result = validateEventParticipants([participant, { ...participant, materialsOption: "home" }], {}, settings, 12.5);
  const email = buildCustomerEventRegistrationEmail({ eventTitle: "Workshop", eventSlug: "workshop", eventStartsAt: null, eventLocation: null, fullName: "Parent", phone: "0888123456", email: "test@example.invalid", participantCount: 2, note: null, participants: result.participants, totalAmount: result.totalAmount }, "https://example.com/event");
  assert.match(email.html, /Материали от ателието/);
  assert.match(email.html, /Материали от вкъщи/);
  assert.match(email.html, /памучна тениска/);
  assert.match(email.html, /30,50/);
  const row = { participants: result.participants, status: "new" } as EventRegistrationRow;
  assert.deepEqual(eventPreparationSummary([row, { ...row, status: "cancelled" }]), [{ label: "Материали", value: "Материали от ателието", count: 1 }, { label: "Материали", value: "Материали от вкъщи", count: 1 }]);
});
test("event structured data has both actual offers, never a misleading base price", () => {
  const event = { title: "Workshop", slug: "workshop", starts_at: "2030-01-01T10:00:00Z", ends_at: null, duration_minutes: 90, address: "София", location: null, format: "in_person", price: 12.5, available_spots: 5, registration_url: null, image_url: null, host_name: null, excerpt: "Text", registration_settings: settings } as EventRow;
  event.registration_settings = { ...settings, materialsPricing: { ...materialsPricing, displayText: "Custom price text" } };
  const schema = buildEventSchema(event, new URL("https://example.com"), new Date("2026-10-15"));
  const offers = schema!.offers as { name: string; price: string }[];
  assert.equal(offers.length, 2);
  assert.deepEqual(offers.map((offer) => offer.price), ["18.00", "12.50"]);
});
