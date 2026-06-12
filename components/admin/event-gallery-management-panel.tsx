import {
  uploadEventGalleryImages,
} from "@/app/admin/event-gallery-actions";
import { AdminListFilter } from "@/components/admin/admin-list-filter";
import { EventGalleryImageTile } from "@/components/admin/event-gallery-image-tile";
import { ImageFileInput } from "@/components/admin/image-file-input";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { EventGalleryImageRow } from "@/lib/admin/types";

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
        Обща галерия за страницата „Събития“. Подредете снимките така, че
        най-новите моменти да са отпред.
      </p>

      <details className="mt-6 rounded-lg border border-boutique-line bg-boutique-bg">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-boutique-ink">
          + Добави снимки
        </summary>
        <form
          action={uploadEventGalleryImages}
          className="grid gap-4 border-t border-boutique-line p-4"
        >
          <ImageFileInput
            className={adminFieldClass}
            helperClassName={adminHelperClass}
            helperText="Можете да изберете до 9 PNG, JPG или WEBP файла наведнъж (до 9 MB общо)."
            label="Добави снимки"
            multiple
            name={adminFormFields.eventGallery.imageFiles}
          />

          <label className="text-sm font-medium text-boutique-ink">
            Alt текст по подразбиране
            <input
              className={adminFieldClass}
              name={adminFormFields.eventGallery.defaultAlt}
              placeholder="Снимка от творческа работилница"
            />
            <p className={adminHelperClass}>
              Използва се за достъпност, ако не зададете отделен текст за
              всяка снимка.
            </p>
          </label>

          <div className="flex justify-end">
            <button className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-boutique-accent">
              Качи в галерията
            </button>
          </div>
        </form>
      </details>

      {images.length === 0 ? (
        <p className="mt-5 text-sm text-boutique-muted">
          Все още няма снимки в галерията.
        </p>
      ) : (
        <>
          <AdminListFilter
            containerId="admin-event-gallery-list"
            filterLabel="Видимост"
            filterOptions={[
              { label: "Публикувани", value: "published" },
              { label: "Скрити", value: "hidden" },
            ]}
            itemSelector="[data-admin-gallery-image]"
            pageSize={80}
            placeholder="Търси по описание..."
            total={images.length}
          />

          <div
            className="mt-4 grid max-h-[36rem] grid-cols-3 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10"
            id="admin-event-gallery-list"
          >
            {images.map((image, index) => (
              <EventGalleryImageTile
                image={image}
                index={index}
                isPrimary={index === 0}
                key={image.id}
                total={images.length}
              />
            ))}
          </div>
        </>
      )}
    </article>
  );
}
