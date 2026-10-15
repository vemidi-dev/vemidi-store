"use client";

import { useEffect, useState } from "react";

type DraftValue = string | boolean;
type DraftPayload = Record<string, DraftValue>;

type AdminFormDraftKeeperProps = {
  formId: string;
  storageKey: string;
};

function isDraftControl(
  element: Element,
): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

function shouldSkipInput(input: HTMLInputElement) {
  if (["content", "registration_settings", "event_gallery_images"].includes(input.name)) return false;
  return ["button", "file", "hidden", "image", "reset", "submit"].includes(input.type);
}

function getFormDraft(form: HTMLFormElement) {
  const draft: DraftPayload = {};
  const controls = Array.from(form.elements).filter(isDraftControl);

  for (const control of controls) {
    if (!control.name) continue;
    if (control instanceof HTMLInputElement && shouldSkipInput(control)) continue;

    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      draft[control.name] = control.checked;
    } else if (control instanceof HTMLInputElement && control.type === "radio") {
      if (control.checked) {
        draft[control.name] = control.value;
      }
    } else {
      draft[control.name] = control.value;
    }
  }

  return draft;
}

function restoreFormDraft(form: HTMLFormElement, draft: DraftPayload) {
  const controls = Array.from(form.elements).filter(isDraftControl);

  for (const control of controls) {
    if (!control.name || !(control.name in draft)) continue;
    if (control instanceof HTMLInputElement && shouldSkipInput(control)) continue;

    const value = draft[control.name];
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      control.checked = value === true;
    } else if (control instanceof HTMLInputElement && control.type === "radio") {
      control.checked = value === control.value;
    } else if (typeof value === "string") {
      control.value = value;
    }
  }
}

export function AdminFormDraftKeeper({
  formId,
  storageKey,
}: AdminFormDraftKeeperProps) {
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("success") === "Събитието е добавено успешно.") {
      window.localStorage.removeItem(storageKey);
      setHasDraft(false);
    }

    const rawDraft = window.localStorage.getItem(storageKey);
    if (rawDraft) {
      try {
        restoreFormDraft(form, JSON.parse(rawDraft) as DraftPayload);
        queueMicrotask(() => form.dispatchEvent(new Event("event-draft-restored")));
        setHasDraft(true);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    const saveDraft = () => {
      window.localStorage.setItem(storageKey, JSON.stringify(getFormDraft(form)));
      setHasDraft(true);
    };

    form.addEventListener("input", saveDraft);
    form.addEventListener("change", saveDraft);
    form.addEventListener("submit", saveDraft);

    return () => {
      form.removeEventListener("input", saveDraft);
      form.removeEventListener("change", saveDraft);
      form.removeEventListener("submit", saveDraft);
    };
  }, [formId, storageKey]);

  return (
    <div className="rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 text-sm text-boutique-muted md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>
          {hasDraft
            ? "Има запазена локална чернова за това събитие."
            : "Попълненото се пази автоматично като локална чернова в този браузър."}
        </p>
        <button
          type="button"
          className="rounded-full border border-boutique-line bg-boutique-paper px-4 py-2 text-xs font-semibold uppercase tracking-wider text-boutique-ink"
          onClick={() => {
            const form = document.getElementById(formId);
            window.localStorage.removeItem(storageKey);
            if (form instanceof HTMLFormElement) {
              form.reset();
            }
            setHasDraft(false);
          }}
        >
          Изчисти черновата
        </button>
      </div>
    </div>
  );
}
