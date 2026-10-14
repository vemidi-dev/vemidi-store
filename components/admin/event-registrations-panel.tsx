import { updateEventRegistrationStatus } from "@/app/admin/event-registration-actions";
import { adminFieldClass, adminPanelClass } from "@/components/admin/styles";
import type { EventRegistrationRow, EventRow } from "@/lib/admin/types";

type EventRegistrationsPanelProps = {
  events: EventRow[];
  registrations: EventRegistrationRow[];
  error: { message: string } | null;
};

const statusLabels = {
  new: "Ново",
  confirmed: "Потвърдено",
  cancelled: "Отказано",
};

export function EventRegistrationsPanel({
  events,
  registrations,
  error,
}: EventRegistrationsPanelProps) {
  const eventNames = new Map(events.map((event) => [event.id, event.title]));
  const totalParticipants = registrations.reduce(
    (sum, registration) => sum + registration.participant_count,
    0,
  );
  const statusCounts = registrations.reduce<Record<EventRegistrationRow["status"], number>>(
    (counts, registration) => ({
      ...counts,
      [registration.status]: counts[registration.status] + 1,
    }),
    { new: 0, confirmed: 0, cancelled: 0 },
  );

  return (
    <section className={adminPanelClass}>
      <h2 className="font-heading text-2xl text-boutique-ink">Записвания за събития</h2>
      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Записванията не могат да се заредят: {error.message}
        </p>
      ) : registrations.length === 0 ? (
        <p className="mt-4 text-sm text-boutique-muted">Все още няма получени записвания.</p>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-boutique-line bg-boutique-bg p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">Всички</p>
              <p className="mt-1 text-2xl font-semibold text-boutique-ink">{registrations.length}</p>
            </div>
            <div className="rounded-xl border border-boutique-line bg-boutique-bg p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">Участници</p>
              <p className="mt-1 text-2xl font-semibold text-boutique-ink">{totalParticipants}</p>
            </div>
            <div className="rounded-xl border border-boutique-line bg-boutique-bg p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">Нови</p>
              <p className="mt-1 text-2xl font-semibold text-boutique-ink">{statusCounts.new}</p>
            </div>
            <div className="rounded-xl border border-boutique-line bg-boutique-bg p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">Потвърдени</p>
              <p className="mt-1 text-2xl font-semibold text-boutique-ink">{statusCounts.confirmed}</p>
            </div>
          </div>
          {registrations.map((registration) => (
            <article key={registration.id} className="rounded-xl border border-boutique-line bg-boutique-bg p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                    {eventNames.get(registration.event_id) ?? "Изтрито събитие"}
                  </p>
                  <h3 className="mt-2 font-semibold text-boutique-ink">{registration.full_name}</h3>
                  <p className="mt-1 text-sm text-boutique-muted">
                    {registration.phone}
                    {registration.email ? ` · ${registration.email}` : ""}
                    {` · ${registration.participant_count} участник${registration.participant_count === 1 ? "" : "а"}`}
                  </p>
                  <p className="mt-1 text-xs text-boutique-muted">
                    {new Intl.DateTimeFormat("bg-BG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/Sofia",
                    }).format(new Date(registration.created_at))}
                  </p>
                  {registration.note ? <p className="mt-3 text-sm text-boutique-ink">{registration.note}</p> : null}
                </div>
                <form action={updateEventRegistrationStatus} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={registration.id} />
                  <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                    Статус
                    <select name="status" defaultValue={registration.status} className={`${adminFieldClass} min-w-40`}>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <button className="rounded-full bg-boutique-ink px-4 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper">
                    Запази
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
