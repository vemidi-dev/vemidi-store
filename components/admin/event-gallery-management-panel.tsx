import {
  deleteEventGalleryImage,
  moveEventGalleryImage,
  uploadEventGalleryImages,
} from "@/app/admin/event-gallery-actions";
import { ImageFileInput } from "@/components/admin/image-file-input";
import { adminFieldClass, adminHelperClass, adminPanelClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { EventGalleryImageRow } from "@/lib/admin/types";

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function EventGalleryManagementPanel({
  images,
}: {
  images: EventGalleryImageRow[];
}) {
  return (
    <article className={adminPanelClass}>
      <h2 className="font-heading text-2xl text-boutique-ink">
        Галерия от минали събития
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-boutique-muted">
        Обща галерия за страницата „Събития“. Снимките не са вързани към конкретно
        събитие — подредете ги така, че най-новите моменти да са отпред.
      </p>

      <form
        action={uploadEventGalleryImages}
        className="mt-6 grid gap-4 rounded-lg border border-boutique-line bg-boutique-bg p-4"
      >
        <ImageFileInput
          name={adminFormFields.eventGallery.imageFiles}
          label="Добави снимки"
          multiple
          className={adminFieldClass}
          helperClassName={adminHelperClass}
          helperText="Може да изберете до 9 PNG, JPG или WEBP файла наведнъж (до 9 MB общо)."
        />

        <label className="text-sm font-medium text-boutique-ink">
          Alt текст по подразбиране
          <input
            name={adminFormFields.eventGallery.defaultAlt}
            placeholder="Снимка от творческа работилница"
            className={adminFieldClass}
          />
          <p className={adminHelperClass}>
            Използва се за достъпност, ако не зададете отделен текст за всяка снимка.
          </p>
        </label>

        <div className="flex justify-end">
          <button className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-boutique-accent">
            Качи в галерията
          </button>
        </div>
      </form>

      {images.length === 0 ? (
        <p className="mt-5 text-sm text-boutique-muted">
          Все още няма снимки в галерията.
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <article
              key={image.id}
              className="rounded-xl border border-boutique-line bg-white p-3"
            >
              <div
                className="aspect-[4/3] rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${image.image_url})` }}
                role="img"
                aria-label={image.alt_text || "Снимка от галерията"}
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-boutique-muted">#{index + 1}</span>
                {!image.is_published ? (
                  <span className="rounded-full bg-boutique-muted/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-boutique-muted">
                    Скрита
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form action={moveEventGalleryImage}>
                  <input
                    type="hidden"
                    name={adminFormFields.eventGallery.imageId}
                    value={image.id}
                  />
                  <input
                    type="hidden"
                    name={adminFormFields.eventGallery.direction}
                    value="up"
                  />
                  <button
                    type="submit"
                    disabled={index === 0}
                    className="rounded-full border border-boutique-line px-3 py-1.5 text-xs disabled:opacity-35"
                  >
                    Нагоре
                  </button>
                </form>
                <form action={moveEventGalleryImage}>
                  <input
                    type="hidden"
                    name={adminFormFields.eventGallery.imageId}
                    value={image.id}
                  />
                  <input
                    type="hidden"
                    name={adminFormFields.eventGallery.direction}
                    value="down"
                  />
                  <button
                    type="submit"
                    disabled={index === images.length - 1}
                    className="rounded-full border border-boutique-line px-3 py-1.5 text-xs disabled:opacity-35"
                  >
                    Надолу
                  </button>
                </form>
                <form action={deleteEventGalleryImage}>
                  <input
                    type="hidden"
                    name={adminFormFields.eventGallery.imageId}
                    value={image.id}
                  />
                  <button
                    type="submit"
                    aria-label="Изтрий"
                    title="Изтрий"
                    className="rounded-md p-1 text-red-600 opacity-70 transition hover:bg-red-50 hover:opacity-100"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </article>
  );
}
