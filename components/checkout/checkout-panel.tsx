"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createStoreOrder,
  type CheckoutActionState,
} from "@/app/checkout/actions";
import { useCart } from "@/components/cart/cart-provider";
import { PageContainer } from "@/components/layout/page-container";
import { formatEur } from "@/lib/format-eur";

const fieldClass =
  "mt-2 w-full rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 text-sm text-boutique-ink outline-none transition placeholder:text-boutique-muted/60 focus:border-boutique-accent/50 focus:ring-2 focus:ring-boutique-accent/10";

const initialState: CheckoutActionState = {
  ok: false,
  message: "",
};

const PURCHASE_STORAGE_KEY = "vemidi:last-purchase";

function SubmitOrderButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || !ready}
      className="mt-6 w-full rounded-full bg-boutique-ink px-6 py-3.5 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Изпращане..." : "Изпрати поръчката"}
    </button>
  );
}

export function CheckoutPanel() {
  const { lines, subtotal, clear } = useCart();
  const router = useRouter();
  const [state, formAction] = useActionState(createStoreOrder, initialState);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  useEffect(() => {
    if (state.ok) {
      if (state.purchase) {
        window.sessionStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(state.purchase));
      }
      clear();
      router.replace("/thank-you");
    }
  }, [clear, router, state.ok, state.purchase]);

  if (state.ok) {
    return (
      <section className="pb-24 pt-8" aria-live="polite">
        <PageContainer className="text-center text-sm text-boutique-muted">
          Поръчката е приета. Пренасочваме ви...
        </PageContainer>
      </section>
    );
  }

  if (lines.length === 0) {
    return (
      <section className="pb-24 pt-8">
        <PageContainer>
          <div className="rounded-2xl border border-boutique-line bg-boutique-paper px-8 py-14 text-center shadow-boutique-sm">
            <h2 className="font-heading text-3xl text-boutique-ink">
              Няма продукти за поръчка
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-boutique-muted">
              Добавете продукт в количката, преди да преминете към данните за доставка.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex rounded-full bg-boutique-ink px-8 py-3 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
            >
              Към магазина
            </Link>
          </div>
        </PageContainer>
      </section>
    );
  }

  return (
    <section className="pb-24 pt-8">
      <PageContainer>
        <form
          action={formAction}
          className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
        >
          <input
            type="hidden"
            name="cart_items"
            value={JSON.stringify(lines)}
          />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <div className="space-y-8">
            <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-6 shadow-boutique-sm md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
                01 · Контакт
              </p>
              <h2 className="mt-3 font-heading text-2xl text-boutique-ink">Вашите данни</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium text-boutique-ink">
                  Име и фамилия
                  <input name="customer_name" required maxLength={120} className={fieldClass} />
                </label>
                <label className="text-sm font-medium text-boutique-ink">
                  Телефон
                  <input
                    name="customer_phone"
                    type="tel"
                    required
                    maxLength={30}
                    className={fieldClass}
                  />
                </label>
                <label className="text-sm font-medium text-boutique-ink sm:col-span-2">
                  Имейл
                  <input
                    name="customer_email"
                    type="email"
                    maxLength={160}
                    className={fieldClass}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-6 shadow-boutique-sm md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
                02 · Доставка
              </p>
              <h2 className="mt-3 font-heading text-2xl text-boutique-ink">
                Адрес и начин на доставка
              </h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium text-boutique-ink">
                  Куриер
                  <select name="courier" defaultValue="" required className={fieldClass}>
                    <option value="" disabled>Изберете</option>
                    <option value="econt">Еконт</option>
                    <option value="speedy">Спиди</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-boutique-ink">
                  Доставка
                  <select name="delivery_type" defaultValue="" required className={fieldClass}>
                    <option value="" disabled>Изберете</option>
                    <option value="office">До офис</option>
                    <option value="address">До адрес</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-boutique-ink">
                  Населено място
                  <input name="city" required maxLength={120} className={fieldClass} />
                </label>
                <label className="text-sm font-medium text-boutique-ink">
                  Офис или пощенски код
                  <input name="office_or_postcode" maxLength={200} className={fieldClass} />
                </label>
                <label className="text-sm font-medium text-boutique-ink sm:col-span-2">
                  Адрес / уточнение за офиса
                  <textarea
                    name="delivery_details"
                    rows={3}
                    maxLength={500}
                    className={`${fieldClass} resize-y`}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-6 shadow-boutique-sm md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
                03 · Плащане и бележка
              </p>
              <div className="mt-5 rounded-xl border border-boutique-line bg-boutique-bg p-4">
                <p className="font-semibold text-boutique-ink">Наложен платеж</p>
                <p className="mt-1 text-sm text-boutique-muted">
                  Плащате на куриера при получаване на поръчката.
                </p>
              </div>
              <label className="mt-5 block text-sm font-medium text-boutique-ink">
                Допълнителна информация
                <textarea
                  name="note"
                  rows={4}
                  maxLength={1000}
                  className={`${fieldClass} resize-y`}
                  placeholder="Срок, специално пожелание или друго уточнение..."
                />
              </label>
              <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed text-boutique-muted">
                <input
                  type="checkbox"
                  name="privacy_consent"
                  required
                  className="mt-1 h-4 w-4 accent-boutique-ink"
                />
                <span>
                  Съгласен/на съм данните ми да бъдат използвани за обработване и
                  доставка на тази поръчка съгласно{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="font-semibold text-boutique-accent underline underline-offset-2"
                  >
                    информацията за поверителност
                  </Link>
                  .
                </span>
              </label>
            </section>

            {state.message ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
              >
                {state.message}
              </div>
            ) : null}
          </div>

          <aside className="h-fit rounded-2xl border border-boutique-line bg-boutique-paper p-6 shadow-boutique-sm lg:sticky lg:top-32">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
              Обобщение
            </p>
            <h2 className="mt-3 font-heading text-2xl text-boutique-ink">
              Вашата поръчка
            </h2>
            <ul className="mt-6 divide-y divide-boutique-line">
              {lines.map((line) => (
                <li key={line.lineId} className="py-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-medium text-boutique-ink">{line.title}</p>
                      <p className="mt-1 text-boutique-muted">Количество: {line.quantity}</p>
                      {line.personalization ? (
                        <p className="mt-1 whitespace-pre-line text-xs text-boutique-muted">
                          Персонализация: {line.personalization}
                        </p>
                      ) : null}
                      {line.selectedColors?.map((color) => (
                        <p key={`${color.fieldId}-${color.optionId}`} className="mt-1 text-xs text-boutique-muted">
                          {color.fieldLabel}: {color.optionName}
                        </p>
                      ))}
                    </div>
                    <p className="shrink-0 font-medium text-boutique-ink">
                      {formatEur(line.price * line.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center justify-between border-t border-boutique-line pt-5">
              <span className="font-semibold text-boutique-ink">Общо</span>
              <span className="font-heading text-2xl text-boutique-ink">
                {formatEur(subtotal)}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-boutique-muted">
              Цената за доставка се заплаща отделно според тарифата на избрания куриер.
            </p>
            <SubmitOrderButton ready={Boolean(idempotencyKey)} />
            <Link
              href="/cart"
              className="mt-4 block text-center text-xs font-semibold uppercase tracking-wider text-boutique-muted hover:text-boutique-ink"
            >
              Назад към количката
            </Link>
          </aside>
        </form>
      </PageContainer>
    </section>
  );
}
