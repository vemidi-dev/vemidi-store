"use client";

import { uploadEventGalleryImages } from "@/app/admin/event-gallery-actions";
import {
  adminFieldClass,
  adminHelperClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import { getImageProfile } from "@/lib/images/profiles";
import { useEffect, useId, useRef, useState } from "react";
import { prepareEventGalleryImages, validateEventGallerySelection } from "@/lib/events/prepare-gallery-images";

const profile = getImageProfile("event_gallery");

export function EventGalleryUploadForm() {
  const inputId = useId();
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    `PNG, JPG или WEBP. До ${profile.maxFilesPerUpload} снимки наведнъж; максимум ${profile.maxImages} в галерията.`,
  );
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      if (busy.current) return;
      const payload = new FormData(event.currentTarget);
      const files = payload.getAll(adminFormFields.eventGallery.imageFiles).filter((value): value is File => value instanceof File && value.size > 0);
      busy.current = true; setPending(true); setError("");
      try {
        setMessage("Намаляване и компресиране на снимките…");
        const prepared = await prepareEventGalleryImages(files);
        payload.delete(adminFormFields.eventGallery.imageFiles);
        prepared.files.forEach((file) => payload.append(adminFormFields.eventGallery.imageFiles, file));
        setMessage(`Качване на ${prepared.files.length} снимки…`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Снимките не могат да бъдат обработени.");
        setMessage(`Избрани ${files.length} файла.`);
        busy.current = false; setPending(false); return;
      }
      try { await uploadEventGalleryImages(payload); }
      catch (cause) {
        if (cause && typeof cause === "object" && "digest" in cause && String(cause.digest).startsWith("NEXT_REDIRECT")) throw cause;
        setError("Не получихме потвърждение за качването. Избраните снимки и текстът остават във формата. Опитайте отново.");
        setMessage(`Избрани ${files.length} файла.`);
      } finally { busy.current = false; setPending(false); }
    }} className="grid gap-4 border-t border-boutique-line p-4">
      <fieldset disabled={pending} className="contents">
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
            setError(files.length ? validateEventGallerySelection(files) ?? "" : "");
            setMessage(files.length ? `Избрани ${files.length} файла за оптимизирано качване.` : "Изберете снимки.");
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
          <button type="submit" disabled={pending} className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-boutique-accent disabled:cursor-not-allowed disabled:opacity-70">{pending ? "Обработване и качване…" : "Качи в галерията"}</button>
        </div>
        {pending ? <p role="status" className="text-sm text-boutique-muted">{message} Моля, не затваряйте страницата.</p> : null}
      </div>
      </fieldset>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
