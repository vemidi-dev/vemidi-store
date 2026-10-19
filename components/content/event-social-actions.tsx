"use client";

import { useId, useState } from "react";
import { Check, Copy, ExternalLink, MapPin, Share2, X } from "lucide-react";
import { eventShareUrl, isEventFacebookUrl } from "@/lib/events/social-links";
import { isAllowedEventMapsUrl } from "@/lib/events/map-link";

export function EventSocialActions({ slug, title, facebookUrl, mapUrl, compact = false, inline = false }: { slug: string; title: string; facebookUrl?: string; mapUrl?: string; compact?: boolean; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const panelId = useId();
  const url = eventShareUrl(slug);
  const buttonClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-boutique-line px-3 py-2 text-sm font-semibold text-boutique-sage-deep transition hover:border-boutique-sage-deep hover:bg-boutique-sage/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const actionClass = inline ? "inline-flex min-h-10 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-boutique-line px-1 py-2 text-xs font-semibold text-boutique-sage-deep transition hover:border-boutique-sage-deep hover:bg-boutique-sage/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 [&_svg]:h-3.5 [&_svg]:w-3.5" : compact ? "inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-boutique-sage-deep underline-offset-4 transition hover:text-boutique-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" : buttonClass;

  async function share() {
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ title, url }))) {
        await navigator.share({ title, url });
        return;
      }
    } catch (error) { if (error instanceof Error && error.name === "AbortError") return; }
    setOpen(true);
  }

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setCopyFailed(false); }
    catch { setCopied(false); setCopyFailed(true); }
  }

  return <div className={`min-w-0 border-t border-boutique-line ${compact ? "mt-3 pt-1" : "mt-4 pt-4"}`}>
    <div className={inline ? "flex flex-nowrap items-center gap-1" : "flex flex-wrap items-center gap-x-4 gap-y-1"}>
      <button type="button" onClick={share} aria-expanded={open} aria-controls={panelId} className={actionClass}><Share2 aria-hidden="true" className="h-4 w-4 shrink-0" />Сподели</button>
      {mapUrl && isAllowedEventMapsUrl(mapUrl) ? <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={actionClass}><MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />Виж локацията<ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" /></a> : null}
      {facebookUrl && isEventFacebookUrl(facebookUrl) ? <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className={actionClass}>Следи във Facebook<ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" /></a> : null}
    </div>
    {open ? <div id={panelId} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} className="mt-3 min-w-0 rounded-lg border border-boutique-line bg-boutique-paper p-3">
      <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">Споделяне</span><button type="button" title="Затвори споделянето" aria-label="Затвори споделянето" onClick={() => setOpen(false)} className="p-2"><X className="h-4 w-4" /></button></div>
      <div className="mt-2 flex flex-wrap gap-2"><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className={buttonClass}>Facebook<ExternalLink aria-hidden="true" className="h-4 w-4" /></a><button type="button" onClick={copy} className={buttonClass}>{copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{copied ? "Копирано" : "Копирай линка"}</button></div>
      {copyFailed ? <label className="mt-3 block text-sm">Линк за копиране<input readOnly value={url} onFocus={(event) => event.target.select()} className="mt-1 w-full min-w-0 rounded border border-boutique-line p-2" /></label> : null}
      <span role="status" className="sr-only">{copied ? "Линкът е копиран." : copyFailed ? "Копирайте линка от полето." : ""}</span>
    </div> : null}
  </div>;
}
