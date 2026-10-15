"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { updateEventRegistrationStatus, updateEventParticipantStatus } from "@/app/admin/event-registration-actions";
import { adminFieldClass, adminPanelClass } from "@/components/admin/styles";
import type { EventRegistrationRow, EventRow } from "@/lib/admin/types";
import { activeEventParticipantCount, eventRegistrationsCsv, eventPreparationSummary, eventRegistrationStatusLabels, filterEventRegistrations, getEventRegistrationCounts } from "@/lib/admin/event-registrations";
import { participantSummaryLines } from "@/lib/events/participant-summary";
import { formatEur } from "@/lib/format-eur";

type Status = EventRegistrationRow["status"];

function RegistrationRow({ registration, onSaved }: { registration: EventRegistrationRow; onSaved: (row: EventRegistrationRow) => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  async function changeStatus(status: Status, participantIndex?: number) {
    if (pending) return;
    const person = participantIndex !== undefined ? registration.participants?.[participantIndex] : undefined;
    if (!window.confirm(person ? `${status === "cancelled" ? "Да откажем ли" : "Да възстановим ли"} участието на ${person.name}?` : status === "cancelled" ? `Да анулираме ли цялото записване на ${registration.full_name} и да освободим ${activeEventParticipantCount(registration)} места?` : registration.status === "cancelled" ? "Да възстановим ли всички участници от това записване?" : "Да потвърдим ли записването?")) return;
    setPending(true);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.set("id", registration.id);
      formData.set("status", status);
      if (participantIndex !== undefined) formData.set("participant_index", String(participantIndex));
      const result = await (participantIndex !== undefined ? updateEventParticipantStatus(formData) : updateEventRegistrationStatus(formData));
      setNotice(result);
      if (result.ok && result.registration) {
        onSaved(result.registration);
        router.refresh();
      }
    } catch {
      setNotice({ ok: false, message: "Записът не може да бъде потвърден. Обновете списъка, преди да опитате отново." });
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="border-t border-boutique-line py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="break-words font-semibold text-boutique-ink">{registration.full_name}</h4>
            <span className={`text-xs font-semibold ${registration.status === "cancelled" ? "text-red-700" : registration.status === "confirmed" ? "text-emerald-800" : "text-boutique-muted"}`}>{eventRegistrationStatusLabels[registration.status]}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-boutique-muted">
            <a href={`tel:${registration.phone}`}>{registration.phone}</a>
            {registration.email ? <a className="break-all" href={`mailto:${registration.email}`}>{registration.email}</a> : null}
            <span>{activeEventParticipantCount(registration)} активни от {registration.participant_count} участници</span>
          </div>
          <p className="mt-1 text-xs text-boutique-muted">{new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Sofia" }).format(new Date(registration.created_at))}</p>
          {registration.note ? <p className="mt-2 whitespace-pre-wrap break-words text-sm text-boutique-ink">{registration.note}</p> : null}
          {registration.participants?.length ? <ul className="mt-3 divide-y divide-boutique-line text-sm text-boutique-ink">{registration.participants.map((person, index) => {
            const cancelled = registration.status === "cancelled" || person.status === "cancelled";
            return <li key={index} className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1 basis-52"><p className="break-words">{participantSummaryLines([person], [], index)[0]}</p><p className={`mt-1 text-xs font-semibold ${cancelled ? "text-red-700" : "text-emerald-800"}`}>{cancelled ? "Отказано участие" : "Активно участие"}</p>{person.cancelledAt ? <p className="mt-1 text-xs text-boutique-muted">Последен отказ: {new Intl.DateTimeFormat("bg-BG", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Sofia" }).format(new Date(person.cancelledAt))}</p> : null}</div>
              <button type="button" disabled={pending} onClick={() => changeStatus(cancelled ? "confirmed" : "cancelled", index)} className={`rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${cancelled ? "border-boutique-line text-boutique-ink" : "border-red-200 text-red-700"}`}>{cancelled ? "Възстанови участието" : "Откажи участието"}</button>
            </li>;
          })}</ul> : null}
          {registration.registration_answers?.length ? <p className="mt-2 whitespace-pre-line text-sm text-boutique-muted">{participantSummaryLines([], registration.registration_answers).join("\n")}</p> : null}
          {registration.total_amount != null ? <p className="mt-2 text-sm font-semibold text-boutique-ink">На място: {formatEur(registration.total_amount)}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {registration.status === "new" ? <button type="button" disabled={pending} onClick={() => changeStatus("confirmed")} className="rounded-lg border border-boutique-line px-3 py-2 text-sm font-semibold text-boutique-ink disabled:opacity-50">Потвърди</button> : null}
          {registration.status === "cancelled" ? <button type="button" disabled={pending} onClick={() => changeStatus("confirmed")} className="rounded-lg border border-boutique-line px-3 py-2 text-sm font-semibold text-boutique-ink disabled:opacity-50">Възстанови цялото записване</button> : <button type="button" disabled={pending} onClick={() => changeStatus("cancelled")} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Анулирай цялото записване</button>}
        </div>
      </div>
      {pending ? <p role="status" className="mt-2 text-sm text-boutique-muted">Запазване…</p> : notice ? <p role={notice.ok ? "status" : "alert"} className={`mt-2 text-sm ${notice.ok ? "text-emerald-800" : "text-red-700"}`}>{notice.message}</p> : null}
    </li>
  );
}

export function EventRegistrationsPanel({ events, registrations, error }: { events: EventRow[]; registrations: EventRegistrationRow[]; error: { message: string } | null }) {
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [updates, setUpdates] = useState<Record<string, EventRegistrationRow>>({});
  const rows = useMemo(() => registrations.map((row) => updates[row.id] && updates[row.id].updated_at >= row.updated_at ? updates[row.id] : row), [registrations, updates]);
  const filtered = filterEventRegistrations(rows, { eventId, status, search });
  const counts = getEventRegistrationCounts(filtered);
  const groups = [...new Set(filtered.map((row) => row.event_id))].map((id) => ({ event: events.find((event) => event.id === id), id, rows: filtered.filter((row) => row.event_id === id) }));
  groups.sort((a, b) => (b.event?.starts_at ?? "").localeCompare(a.event?.starts_at ?? ""));

  return (
    <section className={adminPanelClass}>
      <h2 className="font-heading text-2xl text-boutique-ink">Записвания за събития</h2>
      <button type="button" disabled={!filtered.length} onClick={() => {
        const url = URL.createObjectURL(new Blob([eventRegistrationsCsv(filtered, events)], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a"); link.href = url; link.download = "uchastnici.csv"; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }} className="mt-3 rounded-lg border border-boutique-line px-4 py-2 text-sm font-semibold text-boutique-ink disabled:opacity-40">Свали списъка</button>
      {error ? <p role="alert" className="mt-4 text-sm text-red-700">Записванията не могат да се заредят: {error.message}</p> : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_auto]">
            <label className="min-w-0 text-sm text-boutique-ink">Събитие<select aria-label="Събитие" value={eventId} onChange={(event) => setEventId(event.target.value)} className={adminFieldClass}><option value="">Всички събития</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
            <label className="min-w-0 text-sm text-boutique-ink">Търсене<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Име, телефон, имейл или бележка" className={adminFieldClass} /></label>
            <label className="min-w-0 text-sm text-boutique-ink">Статус<select aria-label="Статус" value={status} onChange={(event) => setStatus(event.target.value)} className={adminFieldClass}><option value="">Всички</option>{Object.entries(eventRegistrationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <button type="button" onClick={() => { setEventId(""); setStatus(""); setSearch(""); }} className="self-end rounded-lg border border-boutique-line px-4 py-3 text-sm text-boutique-ink">Изчисти</button>
          </div>
          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-y border-boutique-line py-4 text-sm">
            {[["Регистрации", counts.total], ["Активни участници", counts.participants], ["Нови", counts.new], ["Потвърдени", counts.confirmed], ["Отказани", counts.cancelled]].map(([label, value]) => <div key={label}><dt className="text-boutique-muted">{label}</dt><dd className="mt-1 text-lg font-semibold text-boutique-ink">{value}</dd></div>)}
          </dl>
          <div className="mt-5 space-y-5">
            {groups.map((group) => {
              const groupCounts = getEventRegistrationCounts(group.rows);
              const preparation = eventPreparationSummary(group.rows);
              return <details key={group.id} open className="min-w-0 border-b border-boutique-line pb-3">
                <summary className="cursor-pointer py-3 text-boutique-ink"><span className="font-semibold">{group.event?.title ?? "Недостъпно събитие"}</span><span className="ml-3 text-sm text-boutique-muted">{groupCounts.total} регистрации · {groupCounts.participants} активни участници</span></summary>
                {preparation.length ? <div className="flex flex-wrap gap-x-5 gap-y-2 py-3 text-sm text-boutique-muted">{preparation.map((item, index) => <span key={index}>{item.label} {item.value}: <strong className="text-boutique-ink">{item.count} бр.</strong></span>)}</div> : null}
                <ul>{group.rows.map((row) => <RegistrationRow key={row.id} registration={row} onSaved={(saved) => setUpdates((previous) => ({ ...previous, [saved.id]: saved }))} />)}</ul>
              </details>;
            })}
            {groups.length === 0 ? <p className="py-4 text-sm text-boutique-muted">{registrations.length ? "Няма записвания по избраните филтри." : "Все още няма получени записвания."}</p> : null}
          </div>
        </>
      )}
    </section>
  );
}
