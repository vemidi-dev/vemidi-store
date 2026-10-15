import assert from "node:assert/strict";
import test from "node:test";
import { defaultEventRegistrationSettings, parseEventRegistrationSettings, validateEventParticipants, type EventRegistrationSettings } from "@/lib/events/registration-config";
import { eventPreparationSummary, eventRegistrationsCsv, filterEventRegistrations } from "@/lib/admin/event-registrations";
import { participantSummaryLines } from "@/lib/events/participant-summary";
import { buildCustomerEventRegistrationEmail } from "@/lib/events/event-registration-email";
import type { EventRegistrationRow } from "@/lib/admin/types";

const settings: EventRegistrationSettings = {
  allowedTypes: ["child", "adult", "child_with_guardian"], age: "required",
  questions: [
    { id: "shirt", label: "Размер тениска", type: "select", scope: "participant", required: true, options: ["128", "140", "M"] },
    { id: "contact", label: "Уточнение", type: "text", scope: "registration", required: false, options: [] },
  ],
};
const child = { name: "Анна", type: "child_with_guardian", age: "7", answers: { shirt: "128" } };
const validate = (people: unknown, answers: unknown = {}) => validateEventParticipants(people, answers, settings, 10);
const row = (changes: Partial<EventRegistrationRow> = {}): EventRegistrationRow => ({ id: "r1", event_id: "e1", full_name: "Родител", phone: "0888123456", email: "test@example.invalid", participant_count: 1, note: null, status: "new", created_at: "2026-10-15", updated_at: "2026-10-15", ...changes });

test("empty legacy config gets safe defaults", () => {
  assert.deepEqual(parseEventRegistrationSettings({}).settings, defaultEventRegistrationSettings);
  assert.deepEqual(participantSummaryLines(), []);
});
test("settings reject no allowed types, duplicate ids and empty select options", () => {
  assert.ok(parseEventRegistrationSettings({ ...settings, allowedTypes: [] }).error);
  assert.ok(parseEventRegistrationSettings({ ...settings, questions: [...settings.questions, settings.questions[0]] }).error);
  assert.ok(parseEventRegistrationSettings({ ...settings, questions: [{ ...settings.questions[0], options: [] }] }).error);
  assert.equal(parseEventRegistrationSettings(settings).error, undefined);
});
test("two participants and a companion reserve only two seats at two prices", () => {
  const result = validate([child, { name: "Иван", type: "adult", age: "", answers: { shirt: "M" } }], { contact: "Ще пристигнем заедно" });
  assert.equal(result.seats, 2);
  assert.equal(result.guardians, 1);
  assert.equal(result.totalAmount, 20);
  assert.equal(result.participants[1].age, null);
  assert.deepEqual(result.participants[0].answers[0], { id: "shirt", label: "Размер тениска", value: "128", type: "select" });
  assert.equal(result.answers[0].value, "Ще пристигнем заедно");
});
test("required per-person sizes are validated separately", () => {
  assert.throws(() => validate([child, { ...child, answers: {} }]), /Размер тениска/);
  assert.throws(() => validate([{ ...child, answers: { shirt: "999" } }]), /Невалиден отговор/);
  assert.throws(() => validate([{ ...child, answers: { shirt: "128", forged: "value" } }]), /Въпросите са променени/);
});
test("reject missing ages, forged types, malformed data and excessive counts", () => {
  assert.throws(() => validate([{ ...child, age: "" }]), /възраст/);
  assert.throws(() => validate([{ ...child, age: true }]), /възраст/);
  assert.throws(() => validate([{ ...child, age: "7.5" }]), /възраст/);
  assert.throws(() => validate([{ ...child, type: "free_adult" }]), /вид/);
  assert.throws(() => validate([]), /между 1 и 10/);
  assert.throws(() => validate(Array(11).fill(child)), /между 1 и 10/);
  assert.throws(() => validate([null]), /вид/);
});
test("optional/hidden ages and unknown prices remain optional", () => {
  const result = validateEventParticipants([{ ...child, age: "" }], {}, { ...settings, age: "hidden" }, null);
  assert.equal(result.participants[0].age, null);
  assert.equal(result.totalAmount, null);
  assert.equal(validateEventParticipants([child, child, child], {}, settings, 7.3).totalAmount, 21.9);
});
test("number and once-per-registration questions follow server configuration", () => {
  const config: EventRegistrationSettings = { ...settings, questions: [{ id: "n", label: "Брой", type: "number", scope: "registration", required: true, options: [] }] };
  const p = { ...child, answers: {} };
  assert.throws(() => validateEventParticipants([p], {}, config, 0), /Попълнете/);
  assert.throws(() => validateEventParticipants([p], { n: "-1" }, config, 0), /Невалиден/);
  assert.equal(validateEventParticipants([p], { n: "2" }, config, 0).answers[0].value, "2");
});
test("preparation counts omit cancelled registrations and preserve old registrations", () => {
  const { participants } = validate([child]);
  assert.deepEqual(eventPreparationSummary([row({ participants }), row({ participants, status: "cancelled" }), row()]), [{ label: "Размер тениска", value: "128", count: 1 }]);
  assert.equal(filterEventRegistrations([row({ participants })], { eventId: "", status: "", search: "Анна" }).length, 1);
});
test("CSV contains participant details and protects spreadsheet formulas", () => {
  const { participants } = validate([child]);
  const csv = eventRegistrationsCsv([row({ full_name: "=SUM(1)", participants, note: 'a,"b"' })], []);
  assert.ok(csv.startsWith("\ufeff"));
  assert.match(csv, /'=SUM\(1\)/);
  assert.match(csv, /Размер тениска: 128/);
  assert.match(csv, /a,""b""/);
});
test("confirmation email includes per-person answers, total and safe escaped text", () => {
  const { participants } = validate([{ ...child, name: "Анна <script>" }]);
  const email = buildCustomerEventRegistrationEmail({ eventTitle: "Workshop", eventSlug: "workshop", eventStartsAt: null, eventLocation: null, fullName: "Parent", phone: "0888123456", email: "test@example.invalid", participantCount: 1, note: null, participants, totalAmount: 10 }, "https://example.com/event");
  assert.match(email.html, /Размер тениска: 128/);
  assert.match(email.html, /Плащане на място/);
  assert.match(email.html, /10,00/);
  assert.match(email.html, /&lt;script&gt;/);
  assert.doesNotMatch(email.html, /<script>/);
});
