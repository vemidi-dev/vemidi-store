import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EventAdminTabs } from "@/components/admin/event-admin-tabs";
import { deleteEventRegistration, updateEventParticipantStatus } from "@/app/admin/event-registration-actions";

test("events workspace has two accessible tabs and accepts a direct participants view", () => {
  for (const initialView of ["events", "participants"] as const) {
    const html = renderToStaticMarkup(createElement(EventAdminTabs, { initialView, eventsContent: "Events content", participantsContent: "Participants content" }));
    assert.equal((html.match(/role="tab"/g) ?? []).length, 2);
    assert.equal((html.match(/role="tabpanel"/g) ?? []).length, 2);
    assert.equal((html.match(/hidden=""/g) ?? []).length, 1);
    assert.match(html, new RegExp(`data-view="${initialView}"[^>]*aria-selected="true"`));
  }
});
test("permanent deletion rejects invalid IDs, participant indexes and absent versions", async () => {
  const validId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  for (const index of ["", "-1", "10", "1.5", "x"]) {
    const form = new FormData(); form.set("id", validId); form.set("participant_index", index);
    assert.equal((await deleteEventRegistration(form)).ok, false);
  }
  const form = new FormData(); form.set("id", "invalid");
  assert.equal((await deleteEventRegistration(form)).ok, false);
  form.set("id", validId);
  assert.match((await deleteEventRegistration(form)).message, /Обновете списъка/);
  form.set("expected_updated_at", "not-a-date");
  assert.match((await deleteEventRegistration(form)).message, /Обновете списъка/);
  form.set("participant_index", "0"); form.set("status", "cancelled");
  assert.equal((await updateEventParticipantStatus(form)).ok, false);
});
