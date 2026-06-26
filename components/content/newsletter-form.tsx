"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  subscribeToNewsletter,
  type NewsletterState,
} from "@/app/blog/actions";

const initialState: NewsletterState = { status: "idle", message: "" };

const topics = [
  { value: "blog", label: "Нови статии в блога" },
  { value: "products", label: "Нови продукти" },
  { value: "events", label: "Предстоящи работилници" },
];

type NewsletterFormProps = {
  variant?: "panel" | "horizontal" | "sidebar";
  defaultTopic?: "blog" | "products" | "events";
};

export function NewsletterForm({
  variant = "panel",
  defaultTopic = "blog",
}: NewsletterFormProps) {
  const [state, formAction, pending] = useActionState(subscribeToNewsletter, initialState);
  const isDark = variant === "panel";

  const form = (
    <form action={formAction} className={variant === "sidebar" ? "mt-5" : "mt-6"}>
      <div className={variant === "horizontal" ? "flex flex-col gap-3 sm:flex-row" : "space-y-3"}>
        <label className="sr-only" htmlFor={`newsletter-email-${variant}`}>
          Имейл адрес
        </label>
        <input
          id={`newsletter-email-${variant}`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Вашият имейл"
          className={`min-w-0 rounded-lg border px-5 py-3 text-sm text-boutique-ink outline-none ${
            variant === "horizontal" ? "flex-1" : "w-full"
          } ${isDark ? "border-white/20 bg-white" : "border-boutique-line bg-boutique-paper"}`}
        />
        {variant === "horizontal" ? (
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-boutique-sage-deep px-7 py-3 text-sm font-semibold text-white transition hover:bg-boutique-ink disabled:opacity-60"
          >
            {pending ? "Записване..." : "Абонирайте се"}
          </button>
        ) : null}
      </div>

      <fieldset className={`mt-4 grid gap-2 ${variant === "horizontal" ? "sm:grid-cols-3" : ""}`}>
        <legend className={`mb-2 text-xs font-semibold ${isDark ? "text-white/80" : "text-boutique-ink"}`}>
          Изберете какво желаете да получавате:
        </legend>
        {topics.map((topic) => (
          <label
            key={topic.value}
            className={`flex items-center gap-2 text-xs ${isDark ? "text-white/80" : "text-boutique-muted"}`}
          >
            <input
              type="checkbox"
              name="topics"
              value={topic.value}
              defaultChecked={topic.value === defaultTopic}
              className="accent-boutique-rose-deep"
            />
            {topic.label}
          </label>
        ))}
      </fieldset>

      <div className="hidden" aria-hidden>
        <label htmlFor={`newsletter-website-${variant}`}>Уебсайт</label>
        <input
          id={`newsletter-website-${variant}`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <label className={`mt-4 flex items-start gap-2 text-xs leading-5 ${isDark ? "text-white/70" : "text-boutique-muted"}`}>
        <input
          type="checkbox"
          name="privacy_consent"
          required
          className="mt-1 accent-boutique-rose-deep"
        />
        <span>
          Съгласен/на съм с{" "}
          <Link href="/privacy" className="font-semibold underline underline-offset-2">
            политиката за поверителност
          </Link>
          .
        </span>
      </label>

      {variant !== "horizontal" ? (
        <button
          type="submit"
          disabled={pending}
          className={`mt-5 w-full rounded-lg px-6 py-3 text-sm font-semibold transition disabled:opacity-60 ${
            isDark
              ? "bg-boutique-rose-deep text-white hover:bg-boutique-sage-deep"
              : "bg-boutique-sage-deep text-white hover:bg-boutique-ink"
          }`}
        >
          {pending ? "Записване..." : "Абонирайте се"}
        </button>
      ) : null}

      {state.message ? (
        <p
          role="status"
          className={`mt-3 text-sm ${
            state.status === "error"
              ? isDark
                ? "text-red-200"
                : "text-red-700"
              : isDark
                ? "text-white"
                : "text-boutique-sage-deep"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );

  if (variant === "horizontal") {
    return (
      <section className="border-y border-boutique-line bg-boutique-warm/70">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-5 py-9 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-sage-deep">
              Новини от VeMiDi
            </p>
            <h2 className="mt-2 font-heading text-2xl text-boutique-ink">
              Изберете новините, които Ви интересуват
            </h2>
          </div>
          {form}
        </div>
      </section>
    );
  }

  if (variant === "sidebar") {
    return (
      <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-6">
        <p className="text-center font-heading text-2xl text-boutique-ink">
          Абонирайте се за вдъхновение
        </p>
        <p className="mt-2 text-center text-xs leading-5 text-boutique-muted">
          Получавайте избраните от Вас новини директно по имейл.
        </p>
        {form}
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-boutique-ink px-6 py-10 text-white md:px-10">
      <div className="mx-auto max-w-2xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
          Новини от ателието
        </p>
        <h2 className="mt-3 text-center font-heading text-3xl">
          Нови идеи директно по имейл
        </h2>
        {form}
      </div>
    </section>
  );
}
