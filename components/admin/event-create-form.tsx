"use client";

import { useState, type ReactNode } from "react";
import { createEvent } from "@/app/admin/content-actions";
import { prepareEventImages } from "@/lib/events/prepare-event-images";

export function EventCreateForm({ children }: { children: ReactNode }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return <form id="admin-event-create-form" className="grid gap-5 md:grid-cols-2" onSubmit={async (event) => {
    event.preventDefault();
    if (pending) return;
    const payload = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    let prepared: FormData;
    try {
      prepared = await prepareEventImages(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Снимките не могат да бъдат подготвени. Данните остават във формата.");
      setPending(false);
      return;
    }
    try {
      await createEvent(prepared);
    } catch (cause) {
      if (cause && typeof cause === "object" && "digest" in cause && String(cause.digest).startsWith("NEXT_REDIRECT")) throw cause;
      setError("Не получихме потвърждение за записа. Данните остават във формата; проверете връзката и опитайте отново.");
    } finally {
      setPending(false);
    }
  }}>
    <fieldset disabled={pending} className="contents">{children}</fieldset>
    {pending ? <p role="status" className="text-sm text-boutique-muted md:col-span-2">Подготовка и записване…</p> : null}
    {error ? <p role="alert" className="text-sm text-red-700 md:col-span-2">{error}</p> : null}
  </form>;
}
