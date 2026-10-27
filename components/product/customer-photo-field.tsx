"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { CUSTOMER_PHOTO_MAX_BYTES, customerPhotoId } from "@/lib/customer-photos/reference";

let sessionRequest: Promise<void> | null = null;
async function ensurePhotoSession() {
  sessionRequest ??= fetch("/api/customer-photos", { cache: "no-store" }).then(response => {
    if (!response.ok) throw new Error("Качването временно не е достъпно.");
  }).finally(() => { sessionRequest = null; });
  return sessionRequest;
}

export function CustomerPhotoField({ productId, fieldId, value, onChange, onBusy }: {
  productId: string;
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const busy = useRef(false);
  const id = customerPhotoId(value);

  async function upload(file: File) {
    if (busy.current) return;
    if (file.size > CUSTOMER_PHOTO_MAX_BYTES || !["image/jpeg", "image/png"].includes(file.type)) {
      setError("Изберете JPEG или PNG снимка до 4 MB.");
      return;
    }
    busy.current = true;
    setPending(true); onBusy(true); setError(null);
    try {
      await ensurePhotoSession();
      const form = new FormData();
      form.set("productId", productId); form.set("fieldId", fieldId); form.set("photo", file);
      const response = await fetch("/api/customer-photos", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok || !customerPhotoId(data?.value)) throw new Error(data?.message || "Снимката не беше качена. Опитайте отново.");
      setFilename(file.name); onChange(data.value);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Неуспешно качване. Опитайте отново.");
    } finally { busy.current = false; setPending(false); onBusy(false); }
  }

  return <div className="mt-2 space-y-2" aria-busy={pending}>
    {id ? <div className="flex items-center gap-3">
      {/* Private photos are served through an ownership-checked route, not Next's public image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/customer-photos/${id}`} alt="Избрана снимка за персонализация" className="h-24 w-24 rounded-lg border border-boutique-line object-contain" />
      <span className="min-w-0 flex-1 break-words text-sm">{filename || "Качена снимка"}</span>
      <button type="button" title="Премахни снимката" aria-label="Премахни снимката" disabled={pending} onClick={() => { onChange(""); setFilename(""); setError(null); }} className="rounded-lg border border-boutique-line p-2 hover:bg-red-50"><Trash2 size={18} /></button>
    </div> : null}
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-boutique-line bg-white px-3 py-2 text-sm font-semibold hover:border-boutique-sage-deep">
      <ImagePlus size={18} aria-hidden />{pending ? "Качва се…" : id ? "Смени снимката" : "Избери снимка"}
      <input id={`personalization-${fieldId}`} type="file" accept="image/jpeg,image/png" disabled={pending} className="sr-only" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
    </label>
    <p className="text-xs font-normal text-boutique-muted">JPEG или PNG до 4 MB</p>
    <p className="text-xs font-normal text-boutique-muted">Снимката се използва само за изработката на поръчката.</p>
    {pending ? <p role="status" className="text-xs text-boutique-muted">Изчакайте снимката да се качи.</p> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
  </div>;
}
