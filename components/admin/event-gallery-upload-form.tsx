"use client";

import { useFormStatus } from "react-dom";

import { uploadEventGalleryImages } from "@/app/admin/event-gallery-actions";
import { AdminFormPendingGuard } from "@/components/admin/admin-form-pending-guard";
import {
  adminFieldClass,
  adminHelperClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import { getImageProfile } from "@/lib/images/profiles";
import { useId, useState } from "react";

const profile = getImageProfile("event_gallery");

function UploadSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-boutique-accent disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Обработване и качване…" : "Качи в галерията"}
    </button>
  );
}

export function EventGalleryUploadForm() {
  const inputId = useId();
  const [message, setMessage] = useState(
    `PNG, JPG или WEBP до ${(profile.maxFileSize / (1024 * 1024)).toFixed(0)} MB. Максимум ${profile.maxImages} снимки в галерията.`,
  );

  return (
    <form action={uploadEventGalleryImages} className="grid gap-4 border-t border-boutique-line p-4">
      <div>
        <p className="text-sm font-medium text-boutique-ink">Добави снимки</p>
        <label
          htmlFor={inputId}
          className={`${adminFieldClass} mt-2 flex cursor-pointer flex-col items-center justify-center border-dashed bg-boutique-paper px-4 py-6 text-center transition hover:border-boutique-accent/50 hover:bg-boutique-bg`}
        >
          <span className="text-sm font-semibold text-boutique-ink">Избери снимки</span>
          <span className="mt-1 text-xs text-boutique-muted">PNG, JPG или WEBP</span>
        </label>
        <input
          id={inputId}
          name={adminFormFields.eventGallery.imageFiles}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            if (files.length === 0) {
              return;
            }

            if (files.length > profile.maxFilesPerUpload) {
              setMessage(`Максимум ${profile.maxFilesPerUpload} файла наведнъж.`);
              return;
            }

            const oversized = files.find((file) => file.size > profile.maxFileSize);
            if (oversized) {
              setMessage(`„${oversized.name}“ надвишава лимита от ${(profile.maxFileSize / (1024 * 1024)).toFixed(0)} MB.`);
              return;
            }

            setMessage(`Избрани ${files.length} файла за оптимизирано качване.`);
          }}
        />
        <p className={adminHelperClass}>{message}</p>
      </div>

      <label className="text-sm font-medium text-boutique-ink">
        Alt текст по подразбиране
        <input
          className={adminFieldClass}
          name={adminFormFields.eventGallery.defaultAlt}
          placeholder="Снимка от творческа работилница"
        />
        <p className={adminHelperClass}>
          Използва се за достъпност, ако не зададете отделен текст за всяка снимка.
        </p>
      </label>

      <div className="space-y-3">
        <div className="flex justify-end">
          <UploadSubmitButton />
        </div>
        <AdminFormPendingGuard message="Обработване и качване на снимки… Моля, не затваряйте страницата." />
      </div>
    </form>
  );
}
