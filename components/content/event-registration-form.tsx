"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { EventParticipantsFields } from "@/components/content/event-participants-fields";
import type { EventRegistrationSettings } from "@/lib/events/registration-config";
import { EVENT_PHONE_ERROR, isValidEventPhone } from "@/lib/events/phone";

import {
  registerForEvent,
  type EventRegistrationState,
} from "@/app/events/actions";

const initialState: EventRegistrationState = { ok: false, message: "" };

type EventRegistrationFormProps = {
  eventId: string;
  eventSlug: string;
  availableSpots: number;
  idempotencyKey: string;
  settings?: EventRegistrationSettings;
  price?: number | null;
};

export function EventRegistrationForm({
  eventId,
  eventSlug,
  availableSpots,
  idempotencyKey,
  settings,
  price = null,
}: EventRegistrationFormProps) {
  const [state, formAction, pending] = useActionState(registerForEvent, initialState);
  const maxParticipants = Math.min(availableSpots, 10);
  const [contact, setContact] = useState({ full_name: "", phone: "", email: "", note: "" });
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneErrorId = useId();
  const phoneInvalid = phoneTouched && !isValidEventPhone(contact.phone);

  if (state.ok) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
        <h2 className="font-heading text-2xl">Благодарим!</h2>
        <p className="mt-2 text-sm">{state.message}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-boutique-line bg-boutique-paper p-5 sm:p-6">
      <h2 className="font-heading text-2xl text-boutique-ink">Запази място</h2>
      <p className="mt-2 text-sm text-boutique-muted">
        Мястото се запазва при успешно записване. Плащането е на място. Полетата със * са задължителни.
      </p>
      <form action={formAction} className="mt-6 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="event_id" value={eventId} />
        <input type="hidden" name="event_slug" value={eventSlug} />
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        {settings ? <input type="hidden" name="expected_price" value={price === null ? "" : String(price)} /> : null}
        {settings ? <input type="hidden" name="expected_settings" value={JSON.stringify(settings)} /> : null}
        <label className="hidden" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <label className="text-sm font-medium text-boutique-ink">
          Контактно лице *
          <input name="full_name" required minLength={3} maxLength={120} autoComplete="name" value={contact.full_name} onChange={(event) => setContact({ ...contact, full_name: event.target.value })} className="mt-2 w-full rounded-lg border border-boutique-line bg-white px-4 py-3" />
        </label>
        <label className="text-sm font-medium text-boutique-ink">
          Телефон *
          <input name="phone" type="tel" inputMode="tel" required maxLength={30} autoComplete="tel" value={contact.phone} aria-invalid={phoneInvalid} aria-describedby={phoneInvalid ? phoneErrorId : undefined} onBlur={() => setPhoneTouched(true)} onChange={(event) => {
            const phone = event.target.value;
            event.target.setCustomValidity(!phone || isValidEventPhone(phone) ? "" : EVENT_PHONE_ERROR);
            setContact({ ...contact, phone });
          }} className="mt-2 w-full rounded-lg border border-boutique-line bg-white px-4 py-3 aria-[invalid=true]:border-red-500" />
          {phoneInvalid ? <span id={phoneErrorId} className="mt-2 block text-xs font-normal text-red-700">{EVENT_PHONE_ERROR}</span> : null}
        </label>
        <label className="text-sm font-medium text-boutique-ink">
          Имейл *
          <input name="email" type="email" required autoComplete="email" maxLength={160} value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} className="mt-2 w-full rounded-lg border border-boutique-line bg-white px-4 py-3" />
        </label>
        {!settings ? <label className="text-sm font-medium text-boutique-ink">
          Брой участници
          <select name="participant_count" defaultValue="1" className="mt-2 w-full rounded-xl border border-boutique-line bg-white px-4 py-3">
            {Array.from({ length: maxParticipants }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </label> : null}
        {settings ? <EventParticipantsFields settings={settings} availableSpots={availableSpots} price={price} /> : null}
        <label className="text-sm font-medium text-boutique-ink sm:col-span-2">
          {settings ? "Бележка (по избор)" : "Бележка / име и възраст на дете (по избор)"}
          <textarea
            name="note"
            rows={3}
            maxLength={1000}
            value={contact.note}
            onChange={(event) => setContact({ ...contact, note: event.target.value })}
            placeholder="Например: Мария, 7 г.; алергии, придружител или друг детайл"
            className="mt-2 w-full resize-y rounded-xl border border-boutique-line bg-white px-4 py-3"
          />
        </label>
        <label className="flex items-start gap-3 text-sm text-boutique-muted sm:col-span-2">
          <input name="privacy_consent" type="checkbox" required className="mt-1 h-4 w-4 accent-boutique-ink" />
          <span>Съгласен/съгласна съм данните ми да бъдат използвани за обработване на записването. <Link href="/privacy" target="_blank" className="underline">Поверителност</Link></span>
        </label>
        {state.message ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">
            {state.message}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <button disabled={pending} className="rounded-full bg-boutique-ink px-7 py-3 text-sm font-semibold text-boutique-paper disabled:cursor-wait disabled:opacity-60">
            {pending ? "Запазване…" : "Запази място"}
          </button>
        </div>
      </form>
    </section>
  );
}
