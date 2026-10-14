import type { EventRegistrationRow } from "@/lib/admin/types";

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
    const text = [registration.full_name, registration.email, registration.note].filter(Boolean).join(" ").toLocaleLowerCase("bg-BG");
    return text.includes(query) || Boolean(compactQuery && registration.phone.replace(/[\s()+-]/g, "").includes(compactQuery));
  });
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
