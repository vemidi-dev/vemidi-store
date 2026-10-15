"use client";

import { useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveEventChanges } from "@/app/admin/content-actions";
import type { EventRow } from "@/lib/admin/types";
import { prepareEventImages } from "@/lib/events/prepare-event-images";

export function EventEditForm({ children, version, onSaved }: { children: ReactNode; version: string; onSaved: (event: EventRow) => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      const invalid = Array.from(form.elements).find((control) => (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) && !control.validity.valid) as HTMLInputElement | undefined;
      const label = invalid?.labels?.[0]?.childNodes[0]?.textContent?.trim() || invalid?.name || "полето";
      setResult({ ok: false, message: `Проверете „${label}“: ${invalid?.validationMessage ?? "невалидна стойност"}` });
      form.reportValidity();
      return;
    }
    setPending(true);
    setResult(null);
    const payload = new FormData(form);
    try {
      const saved = await saveEventChanges(await prepareEventImages(payload));
      setResult(saved);
      if (saved.ok && saved.event) {
        onSaved(saved.event);
        router.refresh();
      }
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "Не получихме потвърждение за записа. Данните остават във формата; проверете връзката и опитайте отново." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form key={version} noValidate onSubmit={submit} className="mt-4 grid min-w-0 gap-4 md:grid-cols-2 [&_input]:min-w-0 [&_label]:min-w-0 [&_select]:min-w-0 [&_textarea]:min-w-0">
      <fieldset disabled={pending} className="contents">{children}</fieldset>
      <div className="md:col-span-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-boutique-ink px-6 py-3 text-sm font-semibold text-boutique-paper disabled:opacity-50">{pending ? "Запазване…" : "Запази промените"}</button>
        {result ? <p role={result.ok ? "status" : "alert"} className={`mt-3 text-sm ${result.ok ? "text-emerald-800" : "text-red-700"}`}>{result.message}</p> : null}
      </div>
    </form>
  );
}
