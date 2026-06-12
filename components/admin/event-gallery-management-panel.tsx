import { AdminListFilter } from "@/components/admin/admin-list-filter";
import { EventGalleryAdminGrid } from "@/components/admin/event-gallery-admin-grid";
import { EventGalleryUploadForm } from "@/components/admin/event-gallery-upload-form";
import { adminPanelClass } from "@/components/admin/styles";
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
        Обща галерия за страницата „Събития“. Снимките се оптимизират автоматично
        преди качване. Подредете ги така, че най-новите моменти да са отпред.
      </p>

      <details className="mt-6 rounded-lg border border-boutique-line bg-boutique-bg">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-boutique-ink">
          + Добави снимки
        </summary>
        <EventGalleryUploadForm />
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
            pageSize={9999}
            placeholder="Търси по описание..."
            total={images.length}
          />

          <div id="admin-event-gallery-list">
            <EventGalleryAdminGrid images={images} />
          </div>
        </>
      )}
    </article>
  );
}
