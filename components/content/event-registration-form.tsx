"use client";

import { useActionState } from "react";

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
};

export function EventRegistrationForm({
  eventId,
  eventSlug,
  availableSpots,
  idempotencyKey,
}: EventRegistrationFormProps) {
  const [state, formAction, pending] = useActionState(registerForEvent, initialState);
  const maxParticipants = Math.min(availableSpots, 10);

  if (state.ok) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
        <h2 className="font-heading text-2xl">Благодарим!</h2>
        <p className="mt-2 text-sm">{state.message}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-6">
      <h2 className="font-heading text-2xl text-boutique-ink">Запиши се</h2>
      <p className="mt-2 text-sm text-boutique-muted">
        Изпратете заявка за място. Записването се потвърждава след обратна връзка от нас.
      </p>
      <form action={formAction} className="mt-6 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="event_id" value={eventId} />
        <input type="hidden" name="event_slug" value={eventSlug} />
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        <label className="hidden" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <label className="text-sm font-medium text-boutique-ink">
          Име и фамилия
          <input name="full_name" required maxLength={120} className="mt-2 w-full rounded-xl border border-boutique-line bg-white px-4 py-3" />
        </label>
        <label className="text-sm font-medium text-boutique-ink">
          Телефон
          <input name="phone" type="tel" required maxLength={30} className="mt-2 w-full rounded-xl border border-boutique-line bg-white px-4 py-3" />
        </label>
        <label className="text-sm font-medium text-boutique-ink">
          Имейл (по избор)
          <input name="email" type="email" maxLength={160} className="mt-2 w-full rounded-xl border border-boutique-line bg-white px-4 py-3" />
        </label>
        <label className="text-sm font-medium text-boutique-ink">
          Брой участници
          <select name="participant_count" defaultValue="1" className="mt-2 w-full rounded-xl border border-boutique-line bg-white px-4 py-3">
            {Array.from({ length: maxParticipants }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-boutique-ink sm:col-span-2">
          Бележка (по избор)
          <textarea name="note" rows={3} maxLength={1000} className="mt-2 w-full resize-y rounded-xl border border-boutique-line bg-white px-4 py-3" />
        </label>
        <label className="flex items-start gap-3 text-sm text-boutique-muted sm:col-span-2">
          <input name="privacy_consent" type="checkbox" required className="mt-1 h-4 w-4 accent-boutique-ink" />
          Съгласен/съгласна съм данните ми да бъдат използвани за обработване на записването.
        </label>
        {state.message ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">
            {state.message}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <button disabled={pending} className="rounded-full bg-boutique-ink px-7 py-3 text-sm font-semibold text-boutique-paper disabled:cursor-wait disabled:opacity-60">
            {pending ? "Изпращане..." : "Изпратете записването"}
          </button>
        </div>
      </form>
    </section>
  );
}
