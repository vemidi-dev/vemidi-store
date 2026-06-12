"use client";

import Image from "next/image";
import { useState } from "react";

import {
  deleteEventGalleryImage,
  moveEventGalleryImage,
} from "@/app/admin/event-gallery-actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { EventGalleryImageRow } from "@/lib/admin/types";

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

type EventGalleryImageTileProps = {
  image: EventGalleryImageRow;
  index: number;
  total: number;
  isPrimary: boolean;
};

export function EventGalleryImageTile({
  image,
  index,
  total,
  isPrimary,
}: EventGalleryImageTileProps) {
  const [broken, setBroken] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const alt = image.alt_text || "Снимка от галерията";

  return (
    <>
      <article
        className="group overflow-hidden rounded-lg border border-boutique-line bg-white"
        data-admin-gallery-image
        data-filter={image.is_published ? "published" : "hidden"}
        data-search={image.alt_text || "без описание"}
      >
        <div className="relative aspect-square bg-boutique-bg">
          {broken || !image.image_url ? (
            <MediaPlaceholder label="Липсва" className="h-full text-[0.55rem]" />
          ) : (
            <button
              type="button"
              aria-label={`Преглед на ${alt}`}
              className="relative block h-full w-full"
              onClick={() => setPreviewOpen(true)}
            >
              <Image
                alt=""
                src={image.image_url}
                fill
                sizes="80px"
                loading="lazy"
                onError={() => setBroken(true)}
                className="object-cover"
              />
            </button>
          )}

          {isPrimary ? (
            <span className="absolute left-1 top-1 rounded bg-boutique-ink/85 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white">
              Първа
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-1 px-1.5 pt-1">
          <span className="text-[10px] font-medium text-boutique-muted">#{index + 1}</span>
          {!image.is_published ? (
            <span className="rounded-full bg-boutique-muted/15 px-1.5 py-px text-[8px] font-semibold uppercase text-boutique-muted">
              Скрита
            </span>
          ) : null}
        </div>

        <p className="truncate px-1.5 pb-1 text-[10px] text-boutique-ink" title={alt}>
          {alt}
        </p>

        <div className="flex items-center gap-0.5 border-t border-boutique-line/60 p-1">
          <button
            type="button"
            aria-label={`Преглед на ${alt}`}
            className="grid h-6 w-6 place-items-center rounded border border-boutique-line text-[10px] text-boutique-ink hover:border-boutique-accent/40"
            onClick={() => setPreviewOpen(true)}
            title="Преглед"
          >
            ⧉
          </button>
          <form action={moveEventGalleryImage}>
            <input name={adminFormFields.eventGallery.imageId} type="hidden" value={image.id} />
            <input name={adminFormFields.eventGallery.direction} type="hidden" value="up" />
            <button
              aria-label="Премести нагоре"
              className="grid h-6 w-6 place-items-center rounded border border-boutique-line text-[10px] disabled:opacity-35"
              disabled={index === 0}
              title="Премести нагоре"
              type="submit"
            >
              ↑
            </button>
          </form>
          <form action={moveEventGalleryImage}>
            <input name={adminFormFields.eventGallery.imageId} type="hidden" value={image.id} />
            <input name={adminFormFields.eventGallery.direction} type="hidden" value="down" />
            <button
              aria-label="Премести надолу"
              className="grid h-6 w-6 place-items-center rounded border border-boutique-line text-[10px] disabled:opacity-35"
              disabled={index === total - 1}
              title="Премести надолу"
              type="submit"
            >
              ↓
            </button>
          </form>
          <AdminConfirmForm
            action={deleteEventGalleryImage}
            className="ml-auto"
            confirmMessage="Сигурни ли сте, че искате да изтриете тази снимка от галерията?"
          >
            <input name={adminFormFields.eventGallery.imageId} type="hidden" value={image.id} />
            <button
              aria-label={`Изтрий ${alt}`}
              className="grid h-6 w-6 place-items-center rounded text-red-600 opacity-70 hover:bg-red-50 hover:opacity-100"
              title="Изтрий"
              type="submit"
            >
              <IconTrash className="h-3 w-3" />
            </button>
          </AdminConfirmForm>
        </div>
      </article>

      {previewOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Преглед: ${alt}`}
          onClick={() => setPreviewOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setPreviewOpen(false);
            }
          }}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-boutique-ink"
            onClick={() => setPreviewOpen(false)}
          >
            Затвори
          </button>
          {broken || !image.image_url ? (
            <div className="h-64 w-64">
              <MediaPlaceholder label="Изображението не е налично" />
            </div>
          ) : (
            <img
              alt={alt}
              className="max-h-[85vh] max-w-[min(92vw,56rem)] rounded-lg object-contain shadow-2xl"
              src={image.image_url}
              onClick={(event) => event.stopPropagation()}
            />
          )}
        </div>
      ) : null}
    </>
  );
}
