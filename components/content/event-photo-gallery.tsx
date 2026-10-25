"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ContentImage } from "@/components/content/content-image";
import type { EventPhoto } from "@/lib/events/registration-config";

export function EventPhotoGallery({ photos }: { photos: EventPhoto[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected !== null && !dialog.current?.open) dialog.current?.showModal();
  }, [selected]);
  return <>
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{photos.map((photo, index) => <button key={photo.image_url} type="button" onClick={() => setSelected(index)} aria-label={`Увеличи снимка ${index + 1}: ${photo.alt_text}`} title="Увеличи снимката" className="aspect-[4/5] overflow-hidden rounded-lg border border-boutique-line"><ContentImage src={photo.image_url} alt={photo.alt_text} label="Снимка от работилницата" sizes="(max-width: 639px) calc((100vw - 56px) / 2), (max-width: 1023px) calc((100vw - 72px) / 3), (max-width: 1152px) calc((100vw - 88px) / 4), 260px" /></button>)}</div>
    <dialog ref={dialog} onClose={() => setSelected(null)} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }} aria-label="Снимки от работилницата" className="fixed inset-0 m-auto max-h-[95dvh] max-w-[96vw] rounded-lg bg-white p-3 backdrop:bg-black/70">
      <div className="mb-2 flex items-center justify-between gap-4"><p className="text-sm text-boutique-ink">{selected === null ? "" : `${selected + 1} / ${photos.length}`}</p><button type="button" autoFocus title="Затвори" aria-label="Затвори снимката" onClick={() => dialog.current?.close()} className="grid h-10 w-10 place-items-center text-2xl">×</button></div>
      {selected !== null ? <div className="relative h-[70dvh] w-[85vw] max-w-5xl"><Image src={photos[selected].image_url} alt={photos[selected].alt_text} fill sizes="85vw" className="object-contain" /></div> : null}
      <div className="mt-2 flex justify-between gap-4"><button type="button" disabled={selected === 0} title="Предишна снимка" aria-label="Предишна снимка" onClick={() => setSelected((index) => Math.max(0, (index ?? 0) - 1))} className="h-10 w-10 text-xl disabled:opacity-30">←</button><button type="button" disabled={selected === photos.length - 1} title="Следваща снимка" aria-label="Следваща снимка" onClick={() => setSelected((index) => Math.min(photos.length - 1, (index ?? 0) + 1))} className="h-10 w-10 text-xl disabled:opacity-30">→</button></div>
    </dialog>
  </>;
}
