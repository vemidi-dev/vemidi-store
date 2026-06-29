"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import type { CookieConsentPreferences } from "@/lib/consent/types";

type CookieConsentSettingsDialogProps = {
  open: boolean;
  draft: Pick<CookieConsentPreferences, "analytics" | "marketing">;
  onDraftChange: (
    next: Pick<CookieConsentPreferences, "analytics" | "marketing">,
  ) => void;
  onSave: () => void;
  onClose: () => void;
};

function ConsentToggle({
  checked,
  disabled,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onChange?: (checked: boolean) => void;
}) {
  const inputId = useId();

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-boutique-line/80 bg-boutique-paper/70 px-4 py-3">
      <div>
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-boutique-ink"
        >
          {label}
        </label>
        <p className="mt-1 text-xs leading-relaxed text-boutique-muted">
          {description}
        </p>
      </div>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-boutique-accent disabled:cursor-not-allowed"
      />
    </div>
  );
}

export function CookieConsentSettingsDialog({
  open,
  draft,
  onDraftChange,
  onSave,
  onClose,
}: CookieConsentSettingsDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousFocus = document.activeElement;

    dialogRef.current?.focus();

    return () => {
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-boutique-ink/40 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="w-full max-w-lg rounded-2xl border border-boutique-line bg-boutique-bg shadow-boutique outline-none"
      >
        <div className="border-b border-boutique-line/80 px-5 py-4 sm:px-6">
          <h2
            id={titleId}
            className="font-heading text-2xl text-boutique-ink"
          >
            Настройки на бисквитките
          </h2>
          <p
            id={descriptionId}
            className="mt-2 text-sm leading-relaxed text-boutique-muted"
          >
            Изберете кои категории бисквитки да разрешите. Необходимите
            бисквитки винаги са активни, за да работи сайтът коректно.
          </p>
        </div>

        <div className="space-y-3 px-5 py-4 sm:px-6">
          <ConsentToggle
            checked
            disabled
            label="Необходими"
            description="Нужни за основната работа на сайта, сигурността и запазването на избора ви."
          />
          <ConsentToggle
            checked={draft.analytics}
            label="Аналитични"
            description="Помагат ни да разбираме как се използва сайтът. В момента не се зареждат външни аналитични инструменти."
            onChange={(analytics) => onDraftChange({ ...draft, analytics })}
          />
          <ConsentToggle
            checked={draft.marketing}
            label="Маркетингови"
            description="Използват се за персонализирани реклами и измерване на кампании. В момента не се зареждат външни маркетингови инструменти."
            onChange={(marketing) => onDraftChange({ ...draft, marketing })}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-boutique-line/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            href="/cookies"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-sage-deep underline-offset-4 transition hover:text-boutique-accent hover:underline"
          >
            Политика за бисквитки
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-boutique-line px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
            >
              Затвори
            </button>
            <button
              type="button"
              onClick={onSave}
              className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
            >
              Запазване на избора
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
