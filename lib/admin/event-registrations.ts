import type { EventRegistrationRow } from "@/lib/admin/types";
import type { EventRow } from "@/lib/admin/types";
import { participantSummaryLines } from "@/lib/events/participant-summary";

export const eventRegistrationStatusLabels = {
  new: "Ново",
  confirmed: "Потвърдено",
  cancelled: "Отказано",
};

export function filterEventRegistrations(
  registrations: EventRegistrationRow[],
  { eventId, status, search }: { eventId: string; status: string; search: string },
) {
  const query = search.trim().toLocaleLowerCase("bg-BG");
  const compactQuery = query.replace(/[\s()+-]/g, "");
  return registrations.filter((registration) => {
    if (eventId && registration.event_id !== eventId) return false;
    if (status && registration.status !== status) return false;
    if (!query) return true;
    const text = [registration.full_name, registration.email, registration.note, ...participantSummaryLines(registration.participants, registration.registration_answers)].filter(Boolean).join(" ").toLocaleLowerCase("bg-BG");
    return text.includes(query) || Boolean(compactQuery && registration.phone.replace(/[\s()+-]/g, "").includes(compactQuery));
  });
}

export function eventPreparationSummary(rows: EventRegistrationRow[]) {
  const counts = new Map<string, { label: string; value: string; count: number }>();
  for (const row of rows.filter((item) => item.status !== "cancelled")) {
    for (const p of row.participants ?? []) {
      for (const a of p.answers.filter((answer) => answer.type === "select")) {
        const key = JSON.stringify([a.id, a.label, a.value]);
        counts.set(key, { label: a.label, value: a.value, count: (counts.get(key)?.count ?? 0) + 1 });
      }
    }
  }
  return [...counts.values()];
}

export function eventRegistrationsCsv(rows: EventRegistrationRow[], events: EventRow[]) {
  const cell = (value: unknown) => {
    const text = String(value ?? "");
    const safe = /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return "\ufeff" + [
    ["Събитие", "Контактно лице", "Телефон", "Имейл", "Статус", "Участници", "Данни за участниците", "Сума на място EUR", "Бележка"],
    ...rows.map((row) => [events.find((event) => event.id === row.event_id)?.title ?? "", row.full_name, row.phone, row.email, eventRegistrationStatusLabels[row.status], row.participant_count, participantSummaryLines(row.participants, row.registration_answers).join("\n"), row.total_amount, row.note]),
  ].map((row) => row.map(cell).join(",")).join("\r\n");
}

export function getEventRegistrationCounts(registrations: EventRegistrationRow[]) {
  return {
    total: registrations.length,
    participants: registrations.reduce((sum, row) => sum + (row.status === "cancelled" ? 0 : row.participant_count), 0),
    new: registrations.filter((row) => row.status === "new").length,
    confirmed: registrations.filter((row) => row.status === "confirmed").length,
    cancelled: registrations.filter((row) => row.status === "cancelled").length,
  };
}
