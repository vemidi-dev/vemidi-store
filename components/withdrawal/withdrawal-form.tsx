"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  submitWithdrawalRequest,
  withdrawalInitialState,
} from "@/app/withdrawal/actions";

const fieldClass =
  "mt-2 w-full rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 text-sm text-boutique-ink outline-none transition placeholder:text-boutique-muted/60 focus:border-boutique-accent/50 focus:ring-2 focus:ring-boutique-accent/10";

const errorClass = "mt-1 text-xs text-red-600";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-boutique-ink px-6 py-3.5 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Изпращане..." : "Потвърждавам отказа"}
    </button>
  );
}

export function WithdrawalForm() {
  const [state, formAction] = useActionState(
    submitWithdrawalRequest,
    withdrawalInitialState,
  );
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const formId = useId();
  const statusId = `${formId}-status`;

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  useEffect(() => {
    if (state.message) {
      document.getElementById(statusId)?.focus();
    }
  }, [state.message, statusId]);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      <div
        id={statusId}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className={`rounded-xl border px-4 py-3 text-sm ${
          state.ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : state.message
              ? "border-red-200 bg-red-50 text-red-700"
              : "hidden"
        }`}
      >
        {state.message}
      </div>

      <label className="block text-sm font-medium text-boutique-ink">
        Номер на поръчка
        <input
          name="order_number"
          type="text"
          required
          autoComplete="off"
          className={fieldClass}
          aria-invalid={Boolean(state.fieldErrors?.order_number)}
          aria-describedby={
            state.fieldErrors?.order_number ? "order_number_error" : undefined
          }
        />
        {state.fieldErrors?.order_number ? (
          <p id="order_number_error" className={errorClass}>
            {state.fieldErrors.order_number}
          </p>
        ) : null}
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-medium text-boutique-ink">
          Имейл от поръчката
          <input
            name="contact_email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            aria-invalid={Boolean(state.fieldErrors?.contact_email)}
            aria-describedby={
              state.fieldErrors?.contact_email ? "contact_email_error" : undefined
            }
          />
          {state.fieldErrors?.contact_email ? (
            <p id="contact_email_error" className={errorClass}>
              {state.fieldErrors.contact_email}
            </p>
          ) : null}
        </label>

        <label className="block text-sm font-medium text-boutique-ink">
          Телефон от поръчката
          <input
            name="contact_phone"
            type="tel"
            autoComplete="tel"
            className={fieldClass}
            aria-invalid={Boolean(state.fieldErrors?.contact_phone)}
            aria-describedby={
              state.fieldErrors?.contact_phone ? "contact_phone_error" : undefined
            }
          />
          {state.fieldErrors?.contact_phone ? (
            <p id="contact_phone_error" className={errorClass}>
              {state.fieldErrors.contact_phone}
            </p>
          ) : null}
        </label>
      </div>

      <p className="text-xs text-boutique-muted">
        Попълнете поне един от двата контакта — имейл или телефон, както са
        посочени в поръчката.
      </p>

      <label className="block text-sm font-medium text-boutique-ink">
        Име
        <input
          name="customer_name"
          type="text"
          required
          autoComplete="name"
          className={fieldClass}
          aria-invalid={Boolean(state.fieldErrors?.customer_name)}
          aria-describedby={
            state.fieldErrors?.customer_name ? "customer_name_error" : undefined
          }
        />
        {state.fieldErrors?.customer_name ? (
          <p id="customer_name_error" className={errorClass}>
            {state.fieldErrors.customer_name}
          </p>
        ) : null}
      </label>

      <label className="block text-sm font-medium text-boutique-ink">
        Дата на получаване
        <input
          name="received_at"
          type="date"
          required
          className={fieldClass}
          aria-invalid={Boolean(state.fieldErrors?.received_at)}
          aria-describedby={
            state.fieldErrors?.received_at ? "received_at_error" : undefined
          }
        />
        {state.fieldErrors?.received_at ? (
          <p id="received_at_error" className={errorClass}>
            {state.fieldErrors.received_at}
          </p>
        ) : null}
      </label>

      <label className="block text-sm font-medium text-boutique-ink">
        Продукти за отказ
        <span className="mt-1 block text-xs font-normal text-boutique-muted">
          Изброете артикулите или опишете кои продукти отказвате.
        </span>
        <textarea
          name="items_description"
          required
          rows={4}
          className={fieldClass}
          aria-invalid={Boolean(state.fieldErrors?.items_description)}
          aria-describedby={
            state.fieldErrors?.items_description
              ? "items_description_error"
              : undefined
          }
        />
        {state.fieldErrors?.items_description ? (
          <p id="items_description_error" className={errorClass}>
            {state.fieldErrors.items_description}
          </p>
        ) : null}
      </label>

      <fieldset className="space-y-3 rounded-xl border border-boutique-line bg-boutique-bg/60 p-4">
        <legend className="px-1 text-sm font-medium text-boutique-ink">
          Заявление за отказ
        </legend>
        <p className="text-sm text-boutique-muted">
          С настоящото заявявам, че се отказвам от сключения договор за покупка
          на посочените стоки и потвърждавам, че съм информиран/а за разликата
          между отказ от договор и рекламация.
        </p>
        <label className="flex items-start gap-3 text-sm text-boutique-ink">
          <input
            type="checkbox"
            name="statement_confirmed"
            className="mt-1"
            aria-invalid={Boolean(state.fieldErrors?.statement_confirmed)}
            aria-describedby={
              state.fieldErrors?.statement_confirmed
                ? "statement_confirmed_error"
                : undefined
            }
          />
          <span>Потвърждавам заявлението за отказ от договор.</span>
        </label>
        {state.fieldErrors?.statement_confirmed ? (
          <p id="statement_confirmed_error" className={errorClass}>
            {state.fieldErrors.statement_confirmed}
          </p>
        ) : null}
      </fieldset>

      <label className="block text-sm font-medium text-boutique-ink">
        Допълнителна бележка (незадължително)
        <textarea name="note" rows={3} className={fieldClass} />
      </label>

      <p className="text-xs text-boutique-muted">
        Причината за отказ не е задължителна по закон и не се изисква в тази
        форма.
      </p>

      <label className="flex items-start gap-3 text-sm text-boutique-ink">
        <input
          type="checkbox"
          name="confirmation_checked"
          className="mt-1"
          aria-invalid={Boolean(state.fieldErrors?.confirmation_checked)}
          aria-describedby={
            state.fieldErrors?.confirmation_checked
              ? "confirmation_checked_error"
              : undefined
          }
        />
        <span>
          Потвърждавам, че данните са верни и желая да подам заявление за отказ
          от договор.
        </span>
      </label>
      {state.fieldErrors?.confirmation_checked ? (
        <p id="confirmation_checked_error" className={errorClass}>
          {state.fieldErrors.confirmation_checked}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

export function WithdrawalIntroLinks() {
  return (
    <p className="text-sm text-boutique-muted">
      Тази форма е за{" "}
      <strong className="text-boutique-ink">отказ от договор</strong> (право на
      връщане в срок). За дефект или несъответствие използвайте{" "}
      <Link className="font-semibold text-boutique-ink underline" href="/returns">
        Връщане и рекламации
      </Link>
      .
    </p>
  );
}
