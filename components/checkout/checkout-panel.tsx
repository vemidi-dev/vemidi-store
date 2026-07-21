"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { flushSync, useFormStatus } from "react-dom";

import {
  createStoreOrder,
  type CheckoutActionState,
} from "@/app/checkout/actions";
import { previewDiscountCoupon } from "@/app/checkout/coupon-actions";
import { CheckoutDeliveryFields } from "@/components/checkout/checkout-delivery-fields";
import { MetaPixelInitiateCheckoutBridge } from "@/components/consent/meta-pixel-initiate-checkout-bridge";
import { CartLineSummaryDetails } from "@/components/cart/cart-line-summary-details";
import { useCart } from "@/components/cart/cart-provider";
import { PageContainer } from "@/components/layout/page-container";
import { formatEur } from "@/lib/format-eur";
import {
  describeInvalidCouponCheckoutMessage,
  type CouponPreviewResult,
} from "@/lib/checkout/coupon";
import {
  CHECKOUT_LANDING_RETURN_LABEL,
  getCheckoutLandingReturnLinkProps,
  resolveCheckoutLandingReturnUrl,
} from "@/lib/checkout/checkout-landing-return";
import type { CheckoutPageContent } from "@/lib/content/site-content";

const fieldClass =
  "mt-2 w-full rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 text-sm text-boutique-ink outline-none transition placeholder:text-boutique-muted/60 focus:border-boutique-accent/50 focus:ring-2 focus:ring-boutique-accent/10";

const initialState: CheckoutActionState = {
  ok: false,
  message: "",
};

import {
  ORDER_CONFIRMATION_STORAGE_KEY,
  PURCHASE_STORAGE_KEY,
} from "@/lib/checkout/order-confirmation";

function SubmitOrderButton({
  ready,
  label,
  blocked,
}: {
  ready: boolean;
  label: string;
  blocked?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || !ready || Boolean(blocked)}
      className="mt-6 w-full rounded-full bg-boutique-ink px-6 py-3.5 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Изпращане..." : label}
    </button>
  );
}

export function CheckoutPanel({ content }: { content: CheckoutPageContent }) {
  const { lines, subtotal, clear } = useCart();
  const router = useRouter();
  const landingReturnUrl = resolveCheckoutLandingReturnUrl(lines);
  const landingReturnLinkProps = landingReturnUrl
    ? getCheckoutLandingReturnLinkProps(landingReturnUrl)
    : null;
  const [state, formAction] = useActionState(createStoreOrder, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [note, setNote] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponPending, setCouponPending] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<
    Extract<CouponPreviewResult, { ok: true }> | null
  >(null);

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  useEffect(() => {
    setAppliedCoupon(null);
    setCouponError("");
  }, [subtotal]);

  const clearCouponState = () => {
    setCouponInput("");
    setAppliedCoupon(null);
    setCouponError("");
  };

  const handleCouponInputChange = (value: string) => {
    setCouponInput(value);
    if (appliedCoupon || couponError) {
      setAppliedCoupon(null);
      setCouponError("");
    }
  };

  const handleApplyCoupon = async () => {
    setCouponPending(true);
    setCouponError("");
    try {
      const result = await previewDiscountCoupon({
        code: couponInput,
        subtotal,
      });
      if (!result.ok) {
        setAppliedCoupon(null);
        setCouponError(describeInvalidCouponCheckoutMessage(result.code));
        return;
      }
      setCouponInput(result.code);
      setAppliedCoupon(result);
    } catch {
      setAppliedCoupon(null);
      setCouponError("Купонът временно не може да бъде проверен.");
    } finally {
      setCouponPending(false);
    }
  };

  const handleRemoveCoupon = () => {
    clearCouponState();
  };

  const handleOrderWithoutCoupon = () => {
    flushSync(() => {
      clearCouponState();
    });
    formRef.current?.requestSubmit();
  };

  useEffect(() => {
    if (state.ok) {
      if (state.purchase) {
        window.sessionStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(state.purchase));
      }
      if (state.confirmation?.orderRef) {
        window.sessionStorage.setItem(
          ORDER_CONFIRMATION_STORAGE_KEY,
          JSON.stringify({
            orderRef: state.confirmation.orderRef,
            issuedAt: Date.now(),
          }),
        );
      }
      clear();
      router.replace("/thank-you");
    }
  }, [clear, router, state.confirmation, state.ok, state.purchase]);

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
              href="/produkti"
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
      <MetaPixelInitiateCheckoutBridge lines={lines} subtotal={subtotal} />
      <PageContainer>
        <form
          ref={formRef}
          action={formAction}
          className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
        >
          <input
            type="hidden"
            name="cart_items"
            value={JSON.stringify(lines)}
          />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          {appliedCoupon ? (
            <input type="hidden" name="coupon_code" value={appliedCoupon.code} />
          ) : null}
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
                  <input
                    name="customer_name"
                    value={customerName}
                    required
                    maxLength={120}
                    aria-invalid={Boolean(state.fieldErrors?.customer_name)}
                    aria-describedby={
                      state.fieldErrors?.customer_name
                        ? "customer-name-error"
                        : undefined
                    }
                    className={fieldClass}
                    onChange={(event) => setCustomerName(event.target.value)}
                  />
                  {state.fieldErrors?.customer_name ? (
                    <span
                      id="customer-name-error"
                      className="mt-2 block text-xs font-normal text-red-700"
                    >
                      {state.fieldErrors.customer_name}
                    </span>
                  ) : null}
                </label>
                <label className="text-sm font-medium text-boutique-ink">
                  Телефон
                  <input
                    name="customer_phone"
                    type="tel"
                    value={customerPhone}
                    required
                    maxLength={30}
                    aria-invalid={Boolean(state.fieldErrors?.customer_phone)}
                    aria-describedby={
                      state.fieldErrors?.customer_phone
                        ? "customer-phone-error"
                        : undefined
                    }
                    className={fieldClass}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                  />
                  {state.fieldErrors?.customer_phone ? (
                    <span
                      id="customer-phone-error"
                      className="mt-2 block text-xs font-normal text-red-700"
                    >
                      {state.fieldErrors.customer_phone}
                    </span>
                  ) : null}
                </label>
                <label className="text-sm font-medium text-boutique-ink sm:col-span-2">
                  Имейл
                  <input
                    name="customer_email"
                    type="email"
                    value={customerEmail}
                    required
                    maxLength={160}
                    aria-invalid={Boolean(state.fieldErrors?.customer_email)}
                    aria-describedby={
                      state.fieldErrors?.customer_email
                        ? "customer-email-error"
                        : undefined
                    }
                    className={fieldClass}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                  />
                  {state.fieldErrors?.customer_email ? (
                    <span
                      id="customer-email-error"
                      className="mt-2 block text-xs font-normal text-red-700"
                    >
                      {state.fieldErrors.customer_email}
                    </span>
                  ) : null}
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
                  value={note}
                  rows={4}
                  maxLength={1000}
                  className={`${fieldClass} resize-y`}
                  placeholder="Срок, специално пожелание или друго уточнение..."
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed text-boutique-muted">
                <input
                  type="checkbox"
                  name="privacy_consent"
                  checked={privacyConsent}
                  required
                  className="mt-1 h-4 w-4 accent-boutique-ink"
                  onChange={(event) => setPrivacyConsent(event.target.checked)}
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
                      <CartLineSummaryDetails
                        line={line}
                        showPricing
                        className="mt-2"
                      />
                    </div>
                    <p className="shrink-0 font-medium text-boutique-ink">
                      {formatEur(line.price * line.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-3 border-t border-boutique-line pt-5">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-boutique-muted">Междинна сума</span>
                <span className="font-medium text-boutique-ink">{formatEur(subtotal)}</span>
              </div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-boutique-muted">
                    Отстъпка ({appliedCoupon.code}, {appliedCoupon.discountPercentage}%)
                  </span>
                  <span className="font-medium text-boutique-ink">
                    −{formatEur(appliedCoupon.discountAmount)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold text-boutique-ink">Общо</span>
                <span className="font-heading text-2xl text-boutique-ink">
                  {formatEur(appliedCoupon?.total ?? subtotal)}
                </span>
              </div>
            </div>
            <div className="mt-5">
              <label
                htmlFor="coupon_code"
                className="text-xs font-semibold uppercase tracking-wider text-boutique-muted"
              >
                Код за отстъпка
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="coupon_code"
                  type="text"
                  value={couponInput}
                  onChange={(event) => handleCouponInputChange(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={32}
                  placeholder="Въведете код"
                  className={`${fieldClass} mt-0`}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponPending || !couponInput.trim()}
                  className="shrink-0 rounded-xl border border-boutique-line bg-white px-4 py-3 text-sm font-semibold text-boutique-ink transition hover:border-boutique-sage/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {couponPending ? "…" : "Приложи"}
                </button>
              </div>
              {appliedCoupon ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-800">
                  <p className="font-semibold">Купонът е приложен</p>
                  <p className="mt-1">
                    {appliedCoupon.code} · {appliedCoupon.discountPercentage}% · −
                    {formatEur(appliedCoupon.discountAmount)}
                  </p>
                  <p className="mt-1 text-emerald-700/90">
                    Крайната сума се потвърждава отново при поръчка.
                  </p>
                </div>
              ) : null}
              {couponError ? (
                <div
                  className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3"
                  role="alert"
                >
                  <p className="text-xs font-semibold leading-relaxed text-red-800">
                    {couponError}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-red-700/90">
                    Премахнете кода или поръчайте без отстъпка.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-800 transition hover:border-red-300"
                    >
                      Премахни кода
                    </button>
                    <button
                      type="button"
                      onClick={handleOrderWithoutCoupon}
                      disabled={!idempotencyKey}
                      className="rounded-xl bg-boutique-ink px-3 py-2 text-xs font-semibold text-boutique-paper transition hover:bg-boutique-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Поръчай без купон
                    </button>
                  </div>
                </div>
              ) : null}
              {!appliedCoupon && !couponError ? (
                <p className="mt-2 text-xs leading-relaxed text-boutique-muted">
                  Натиснете „Приложи“, за да проверите кода преди поръчка.
                </p>
              ) : null}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-boutique-muted">
              {content["checkout.delivery_price_note"]}
            </p>
            <SubmitOrderButton
              ready={Boolean(idempotencyKey)}
              label={content["checkout.submit_button"]}
              blocked={Boolean(couponError)}
            />
            {landingReturnLinkProps ? (
              <a
                {...landingReturnLinkProps}
                className="mt-4 block max-w-full text-center text-xs font-semibold leading-snug text-boutique-sage-deep underline-offset-4 transition hover:underline"
              >
                {CHECKOUT_LANDING_RETURN_LABEL}
              </a>
            ) : null}
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
