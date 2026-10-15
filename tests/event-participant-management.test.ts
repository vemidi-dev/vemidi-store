import assert from "node:assert/strict";
import test from "node:test";
import { defaultEventRegistrationSettings, eventQuestionApplies, parseEventRegistrationSettings, validateEventParticipants, type EventQuestion } from "@/lib/events/registration-config";
import { activeEventParticipantCount, eventPreparationSummary, eventRegistrationsCsv, getEventRegistrationCounts } from "@/lib/admin/event-registrations";
import { updateEventParticipantStatus } from "@/app/admin/event-registration-actions";
import type { EventRegistrationRow } from "@/lib/admin/types";

const size: EventQuestion = { id: "size", label: "Размер на тениската", type: "select", scope: "participant", required: true, options: ["128", "140"], materialsWhen: "studio" };
const settings = { ...defaultEventRegistrationSettings, questions: [size], materialsPricing: { studio: { price: 16, materials: "Тениска от ателието" }, home: { price: 12, materials: "Своя тениска" } } };
const child = { name: "Дете", type: "child", age: 7, answers: {}, materialsOption: "home" };

test("mixed booking requires a size only for the studio participant", () => {
  const parsed = parseEventRegistrationSettings(settings);
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.settings.questions[0].materialsWhen, "studio");
  const result = validateEventParticipants([child, { ...child, materialsOption: "studio", answers: { size: "128" } }], {}, settings, 12);
  assert.equal(result.totalAmount, 28);
  assert.deepEqual(result.participants[0].answers, []);
  assert.equal(result.participants[1].answers[0].value, "128");
  assert.throws(() => validateEventParticipants([{ ...child, materialsOption: "studio" }], {}, settings, 12), /Размер/);
  assert.throws(() => validateEventParticipants([{ ...child, materialsOption: "studio", answers: { size: "invalid" } }], {}, settings, 12), /Невалиден отговор/);
});
test("hidden answers are discarded server-side, including invalid old selections", () => {
  const result = validateEventParticipants([{ ...child, answers: { size: "invalid" }, status: "cancelled", unitPrice: 0 }], {}, settings, 12);
  assert.deepEqual(result.participants[0].answers, []);
  assert.equal(result.participants[0].status, undefined);
  assert.equal(result.participants[0].unitPrice, 12);
  assert.throws(() => validateEventParticipants([{ ...child, answers: { unknown: "128" } }], {}, settings, 12), /Въпросите са променени/);
});
test("conditions reject wrong scope, missing pricing and unknown values", () => {
  for (const config of [{ ...settings, questions: [{ ...size, scope: "registration" }] }, { ...settings, materialsPricing: undefined }, { ...settings, questions: [{ ...size, materialsWhen: "other" }] }]) assert.ok(parseEventRegistrationSettings(config).error);
  assert.equal(eventQuestionApplies(size, "home"), false);
  assert.equal(eventQuestionApplies(size, undefined), false);
  assert.equal(eventQuestionApplies(size, "studio"), true);
  assert.equal(eventQuestionApplies({ ...size, materialsWhen: undefined }, "home"), true);
});
test("active counts, preparation and CSV exclude cancelled seats but retain their history", () => {
  const validated = validateEventParticipants([child, { ...child, materialsOption: "studio", answers: { size: "128" } }], {}, settings, 12);
  const row = { id: "row", event_id: "event", status: "new", participant_count: 2, full_name: "Parent", phone: "0888123456", participants: [validated.participants[0], { ...validated.participants[1], status: "cancelled" }], total_amount: 12 } as EventRegistrationRow;
  assert.equal(activeEventParticipantCount(row), 1);
  assert.equal(getEventRegistrationCounts([row]).participants, 1);
  assert.deepEqual(eventPreparationSummary([row]), [{ label: "Материали", value: "Материали от вкъщи", count: 1 }]);
  assert.match(eventRegistrationsCsv([row], []), /ОТКАЗАНО/);
  assert.equal(activeEventParticipantCount({ ...row, status: "cancelled" }), 0);
  assert.equal(activeEventParticipantCount({ ...row, participants: [] }), 2);
});
test("participant action rejects malformed indexes before any database call", async () => {
  for (const index of ["", "-1", "1.5", "10", "oops"]) {
    const form = new FormData(); form.set("participant_index", index);
    assert.equal((await updateEventParticipantStatus(form)).ok, false);
  }
});
