"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createStoreOrder,
  type CheckoutActionState,
} from "@/app/checkout/actions";
import { CheckoutDeliveryFields } from "@/components/checkout/checkout-delivery-fields";
import { useCart } from "@/components/cart/cart-provider";
import { PageContainer } from "@/components/layout/page-container";
import { formatEur } from "@/lib/format-eur";
import type { CheckoutPageContent } from "@/lib/content/site-content";

const fieldClass =
  "mt-2 w-full rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 text-sm text-boutique-ink outline-none transition placeholder:text-boutique-muted/60 focus:border-boutique-accent/50 focus:ring-2 focus:ring-boutique-accent/10";

const initialState: CheckoutActionState = {
  ok: false,
  message: "",
};

const PURCHASE_STORAGE_KEY = "vemidi:last-purchase";

function SubmitOrderButton({
  ready,
  label,
}: {
  ready: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || !ready}
      className="mt-6 w-full rounded-full bg-boutique-ink px-6 py-3.5 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Изпращане..." : label}
    </button>
  );
}

export function CheckoutPanel({ content }: { content: CheckoutPageContent }) {
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
              {content["checkout.empty_title"]}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-boutique-muted">
              {content["checkout.empty_text"]}
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex rounded-full bg-boutique-ink px-8 py-3 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
            >
              {content["checkout.empty_button"]}
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
                {content["checkout.contact_eyebrow"]}
              </p>
              <h2 className="mt-3 font-heading text-2xl text-boutique-ink">
                {content["checkout.contact_title"]}
              </h2>
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

            <CheckoutDeliveryFields
              eyebrow={content["checkout.delivery_eyebrow"]}
              title={content["checkout.delivery_title"]}
            />

            <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-6 shadow-boutique-sm md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
                {content["checkout.payment_eyebrow"]}
              </p>
              <div className="mt-5 rounded-xl border border-boutique-line bg-boutique-bg p-4">
                <p className="font-semibold text-boutique-ink">
                  {content["checkout.payment_title"]}
                </p>
                <p className="mt-1 text-sm text-boutique-muted">
                  {content["checkout.payment_text"]}
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
                  {content["checkout.privacy_consent"]}{" "}
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
              {content["checkout.summary_eyebrow"]}
            </p>
            <h2 className="mt-3 font-heading text-2xl text-boutique-ink">
              {content["checkout.summary_title"]}
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
                      {line.optionSelections?.map((selection) => (
                        <p key={selection.groupId} className="mt-1 text-xs text-boutique-muted">
                          {selection.textValue
                            ? `Опция: ${selection.textValue}`
                            : `Опция (${selection.valueIds.length} избора)`}
                        </p>
                      ))}
                      {line.campaign ? (
                        <p className="mt-1 text-xs text-boutique-muted">
                          Кампания: {line.campaign}
                        </p>
                      ) : null}
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
              {content["checkout.delivery_price_note"]}
            </p>
            <SubmitOrderButton
              ready={Boolean(idempotencyKey)}
              label={content["checkout.submit_button"]}
            />
            <Link
              href="/cart"
              className="mt-4 block text-center text-xs font-semibold uppercase tracking-wider text-boutique-muted hover:text-boutique-ink"
            >
              {content["checkout.back_to_cart"]}
            </Link>
          </aside>
        </form>
      </PageContainer>
    </section>
  );
}
