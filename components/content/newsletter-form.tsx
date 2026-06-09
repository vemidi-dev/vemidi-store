"use client";

import { useActionState } from "react";

import {
  subscribeToNewsletter,
  type NewsletterState,
} from "@/app/blog/actions";

const initialState: NewsletterState = { status: "idle", message: "" };

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(subscribeToNewsletter, initialState);

  return (
    <section className="rounded-3xl bg-boutique-ink px-6 py-10 text-boutique-paper md:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-boutique-paper/70">
          Новини от ателието
        </p>
        <h2 className="font-heading mt-3 text-3xl">Нови идеи директно по имейл</h2>
        <p className="mt-3 text-sm leading-relaxed text-boutique-paper/75">
          Получавайте новите статии, творчески идеи и покани за предстоящи работилници.
        </p>
        <form action={formAction} className="mx-auto mt-7 flex max-w-xl flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="newsletter-email">Имейл адрес</label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Вашият имейл"
            className="min-w-0 flex-1 rounded-full border border-boutique-paper/20 bg-boutique-paper px-5 py-3 text-sm text-boutique-ink outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-boutique-accent px-7 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Записване..." : "Абонирай ме"}
          </button>
        </form>
        {state.message ? (
          <p
            role="status"
            className={`mt-4 text-sm ${state.status === "error" ? "text-red-200" : "text-boutique-paper"}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
