import Image from "next/image";

import {
  clearSiteMediaImage,
  updateSiteMediaImage,
} from "@/app/admin/site-media-actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import { AdminSectionAccordion } from "@/components/admin/admin-section-accordion";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import { siteMediaDefaults } from "@/lib/content/site-media-defaults";
import { resolveSiteMedia } from "@/lib/content/site-media";
import type { SiteMediaRow } from "@/lib/content/site-media-types";

function slotCountLabel(count: number): string {
  if (count === 1) {
    return "1 изображение";
  }
  return `${count} изображения`;
}

function SourceBadge({ source }: { source: "uploaded" | "fallback" }) {
  const isUploaded = source === "uploaded";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider ${
        isUploaded
          ? "bg-emerald-50 text-emerald-700"
          : "bg-boutique-bg text-boutique-muted"
      }`}
    >
      {isUploaded ? "Качена" : "Fallback"}
    </span>
  );
}

function SiteMediaSlot({ row }: { row: SiteMediaRow }) {
  const resolved = resolveSiteMedia(row.key, row);
  const fallbackSrc = siteMediaDefaults[row.key].src;
  const hasUploadedImage = resolved.source === "uploaded";

  return (
    <article className="rounded-xl border border-boutique-line/80 bg-boutique-bg/40 p-4">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg border border-boutique-line bg-white lg:w-56">
          <Image
            src={resolved.src}
            alt={resolved.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 224px"
            unoptimized
            className="object-cover"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-lg text-boutique-ink">{row.label}</h3>
              <p className="mt-1 text-xs text-boutique-muted">{row.key}</p>
            </div>
            <SourceBadge source={resolved.source} />
          </div>

          <p className="text-xs leading-relaxed text-boutique-muted">
            {hasUploadedImage ? (
              <>
                Текуща снимка: <span className="break-all">{resolved.src}</span>
              </>
            ) : (
              <>
                Резервна снимка: <span className="font-medium">{fallbackSrc}</span>
              </>
            )}
          </p>

          <form action={updateSiteMediaImage} className="space-y-3">
            <input
              type="hidden"
              name={adminFormFields.siteMedia.key}
              value={row.key}
            />

            <label
              htmlFor={`${row.key}-alt`}
              className="block text-sm font-medium text-boutique-ink"
            >
              Alt текст
              <input
                id={`${row.key}-alt`}
                name={adminFormFields.siteMedia.imageAlt}
                defaultValue={row.image_alt ?? ""}
                maxLength={160}
                className={adminFieldClass}
              />
            </label>

            <label
              htmlFor={`${row.key}-file`}
              className="block text-sm font-medium text-boutique-ink"
            >
              {hasUploadedImage ? "Ново изображение (по избор)" : "Изображение"}
              <input
                id={`${row.key}-file`}
                name={adminFormFields.siteMedia.imageFile}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className={`${adminFieldClass} file:mr-3 file:rounded-full file:border-0 file:bg-boutique-sage file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white`}
              />
              <span className={adminHelperClass}>
                Хоризонтална снимка, мин. 800px къса страна, до 2000px. WebP
                автоматично. PNG, JPEG или WebP.
              </span>
            </label>

            <button
              type="submit"
              className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
            >
              Запази
            </button>
          </form>

          {hasUploadedImage ? (
            <AdminConfirmForm
              action={clearSiteMediaImage}
              confirmMessage="Сигурни ли сте, че искате да премахнете каченото изображение и да върнете резервната снимка?"
              className="inline-block"
            >
              <input
                type="hidden"
                name={adminFormFields.siteMedia.key}
                value={row.key}
              />
              <button
                type="submit"
                className="rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-700 transition hover:bg-red-100"
              >
                Премахни
              </button>
            </AdminConfirmForm>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function SiteMediaManagementPanel({
  rows,
  error,
}: {
  rows: SiteMediaRow[];
  error: string | null;
}) {
  const sections = Map.groupBy(rows, (row) => row.section);

  return (
    <section className={adminPanelClass}>
      <h2 className="font-heading text-2xl text-boutique-ink">
        Изображения на сайта
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-boutique-muted">
        Управлявайте hero и hub изображения за основните страници. Ако не е
        качена снимка, сайтът използва резервните файлове от{" "}
        <code className="text-xs">/assets/*</code>.
      </p>

      {error ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Изображенията не могат да се заредят. Изпълнете{" "}
          <strong>site_media.sql</strong> в Supabase.
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Няма налични записи за изображения. Изпълнете{" "}
          <strong>site_media.sql</strong> в Supabase.
        </div>
      ) : (
        <div className="mt-7 space-y-3">
          {[...sections.entries()].map(([section, sectionRows]) => (
            <AdminSectionAccordion
              key={section}
              title={section}
              countLabel={slotCountLabel(sectionRows.length)}
            >
              <div className="space-y-4">
                {sectionRows.map((row) => (
                  <SiteMediaSlot key={row.key} row={row} />
                ))}
              </div>
            </AdminSectionAccordion>
          ))}
        </div>
      )}
    </section>
  );
}
