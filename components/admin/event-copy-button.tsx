"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { copyEventAsDraft } from "@/app/admin/content-actions";
import type { EventRow } from "@/lib/admin/types";

export function EventCopyButton({ id, onSaved }: { id: string; onSaved: (event: EventRow) => void }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return <div><button type="button" disabled={pending} onClick={async () => {
    setPending(true);
    try {
      const result = await copyEventAsDraft(id);
      setMessage(result.message);
      if (result.ok && result.event) { onSaved(result.event); router.refresh(); }
    } catch { setMessage("Копирането не може да бъде потвърдено. Обновете списъка."); }
    finally { setPending(false); }
  }} className="rounded-lg border border-boutique-line px-3 py-1.5 text-xs font-semibold text-boutique-ink disabled:opacity-40">{pending ? "Копиране…" : "Копирай като чернова"}</button>{message ? <p role="status" className="mt-2 max-w-xs text-xs text-boutique-muted">{message}</p> : null}</div>;
}
