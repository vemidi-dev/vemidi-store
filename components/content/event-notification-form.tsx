"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  subscribeToEventNotifications,
  type EventNotificationState,
} from "@/app/events/notification-actions";

const initialState: EventNotificationState = { status: "idle", message: "" };

export function EventNotificationForm() {
  const [state, formAction, pending] = useActionState(
    subscribeToEventNotifications,
    initialState,
  );

  return (
    <section className="border-b border-boutique-line bg-boutique-warm/65">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-rose-deep">
            Новини от ателието
          </p>
          <h2 className="mt-3 font-heading text-3xl text-boutique-ink">
            Научавайте първи за новите работилници
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-boutique-muted">
            Оставете своя имейл и ще Ви уведомим, когато публикуваме ново творческо
            събитие за деца.
          </p>
        </div>

        <form action={formAction} className="rounded-2xl border border-boutique-line bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="event-notification-email">
              Имейл адрес
            </label>
            <input
              id="event-notification-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Вашият имейл"
              className="min-w-0 flex-1 rounded-lg border border-boutique-line bg-boutique-paper px-5 py-3 text-sm text-boutique-ink outline-none focus:border-boutique-rose-deep"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-boutique-rose-deep px-7 py-3 text-sm font-semibold text-white transition hover:bg-boutique-ink disabled:opacity-60"
            >
              {pending ? "Записване..." : "Извести ме"}
            </button>
          </div>

          <div className="hidden" aria-hidden>
            <label htmlFor="event-notification-website">Уебсайт</label>
            <input
              id="event-notification-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <fieldset className="mt-4 grid gap-2 sm:grid-cols-3">
            <legend className="mb-2 text-xs font-semibold text-boutique-ink">
              Изберете какво желаете да получавате:
            </legend>
            {[
              ["events", "Предстоящи работилници", true],
              ["blog", "Нови статии в блога", false],
              ["products", "Нови продукти", false],
            ].map(([value, label, checked]) => (
              <label
                key={String(value)}
                className="flex items-center gap-2 text-xs text-boutique-muted"
              >
                <input
                  type="checkbox"
                  name="topics"
                  value={String(value)}
                  defaultChecked={Boolean(checked)}
                  className="accent-boutique-rose-deep"
                />
                {String(label)}
              </label>
            ))}
          </fieldset>

          <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-boutique-muted">
            <input
              type="checkbox"
              name="privacy_consent"
              required
              className="mt-1 accent-boutique-rose-deep"
            />
            <span>
              Съгласен/на съм имейлът ми да бъде използван за известия за събития
              съгласно{" "}
              <Link href="/privacy" className="font-semibold underline underline-offset-2">
                политиката за поверителност
              </Link>
              .
            </span>
          </label>

          {state.message ? (
            <p
              role="status"
              className={`mt-3 text-sm ${
                state.status === "error" ? "text-red-700" : "text-boutique-sage-deep"
              }`}
            >
              {state.message}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
