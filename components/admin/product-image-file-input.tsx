"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  PRODUCT_IMAGE_MAX_FILES_PER_UPLOAD,
  PRODUCT_IMAGE_MAX_INPUT_BYTES,
  PRODUCT_IMAGE_MAX_PER_PRODUCT,
} from "@/lib/admin/product-image-constants";

type ProductImageFileInputProps = {
  name: string;
  altTextName?: string;
  label: string;
  className: string;
  helperClassName: string;
  existingGalleryCount?: number;
  helperText?: string;
};

const ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type SelectedFilePreview = {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
};

export function ProductImageFileInput({
  name,
  altTextName,
  label,
  className,
  helperClassName,
  existingGalleryCount = 0,
  helperText,
}: ProductImageFileInputProps) {
  const id = useId();
  const { pending } = useFormStatus();
  const defaultHelper = useMemo(
    () =>
      helperText ??
      `PNG, JPG или WEBP до ${formatMegabytes(PRODUCT_IMAGE_MAX_INPUT_BYTES)}. Максимум ${PRODUCT_IMAGE_MAX_PER_PRODUCT} снимки на продукт. Снимките се оптимизират автоматично преди качване. При грешка при изпращане изберете файловете отново — браузърът не ги запазва автоматично.`,
    [helperText],
  );
  const [message, setMessage] = useState(defaultHelper);
  const [status, setStatus] = useState<"idle" | "ready" | "error">("idle");
  const [previews, setPreviews] = useState<SelectedFilePreview[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewsRef = useRef<SelectedFilePreview[]>([]);
  const remainingSlots = Math.max(0, PRODUCT_IMAGE_MAX_PER_PRODUCT - existingGalleryCount);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
    };
  }, []);

  const syncInputFiles = (items: SelectedFilePreview[]) => {
    const input = inputRef.current;
    if (!input || typeof DataTransfer === "undefined") {
      return;
    }

    const transfer = new DataTransfer();
    items.forEach((item) => transfer.items.add(item.file));
    input.files = transfer.files;
  };

  const updateReadyMessage = (items: SelectedFilePreview[]) => {
    if (items.length === 0) {
      setStatus("idle");
      setMessage(defaultHelper);
      return;
    }

    setStatus("ready");
    setMessage(
      `Избрани ${items.length} файла. Общ размер: ${formatMegabytes(
        items.reduce((sum, item) => sum + item.size, 0),
      )}. Можете да добавяте още снимки преди изпращане.`,
    );
  };

  const removePreview = (idToRemove: string) => {
    setPreviews((current) => {
      const removed = current.find((preview) => preview.id === idToRemove);
      const next = current.filter((preview) => preview.id !== idToRemove);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      syncInputFiles(next);
      updateReadyMessage(next);
      return next;
    });
  };

  return (
    <div>
      <p className="text-sm font-medium text-boutique-ink">{label}</p>
      <label
        htmlFor={id}
        aria-disabled={pending}
        className={`${className} mt-2 flex cursor-pointer flex-col items-center justify-center border-dashed bg-boutique-paper px-4 py-6 text-center transition hover:border-boutique-accent/50 hover:bg-boutique-bg ${
          pending ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <span className="text-sm font-semibold text-boutique-ink">
          {pending ? "Качване…" : "Избери снимки"}
        </span>
        <span className="mt-1 text-xs text-boutique-muted">PNG, JPG или WEBP</span>
      </label>
      <input
        id={id}
        name={name}
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME_TYPES.join(",")}
        className="sr-only"
        disabled={pending}
        onChange={(event) => {
          const input = event.currentTarget;
          const files = Array.from(input.files ?? []);

          if (files.length === 0) {
            return;
          }

          const totalCount = previews.length + files.length;
          if (totalCount > PRODUCT_IMAGE_MAX_FILES_PER_UPLOAD) {
            input.setCustomValidity(
              `Изберете най-много ${PRODUCT_IMAGE_MAX_FILES_PER_UPLOAD} снимки наведнъж.`,
            );
            input.reportValidity();
            setStatus("error");
            setMessage(
              `Избрани са твърде много файлове. Максимум наведнъж: ${PRODUCT_IMAGE_MAX_FILES_PER_UPLOAD}.`,
            );
            syncInputFiles(previews);
            return;
          }

          if (existingGalleryCount + totalCount > PRODUCT_IMAGE_MAX_PER_PRODUCT) {
            input.setCustomValidity(
              `Продуктът може да има най-много ${PRODUCT_IMAGE_MAX_PER_PRODUCT} снимки.`,
            );
            input.reportValidity();
            setStatus("error");
            setMessage(
              `Можете да добавите още най-много ${remainingSlots} снимки към този продукт.`,
            );
            syncInputFiles(previews);
            return;
          }

          const invalidType = files.find((file) => !ACCEPTED_MIME_TYPES.includes(file.type));
          if (invalidType) {
            input.setCustomValidity("Позволени формати: PNG, JPG или WEBP.");
            input.reportValidity();
            setStatus("error");
            setMessage("Невалиден формат. Изберете PNG, JPG или WEBP.");
            syncInputFiles(previews);
            return;
          }

          const oversized = files.find((file) => file.size > PRODUCT_IMAGE_MAX_INPUT_BYTES);
          if (oversized) {
            input.setCustomValidity(
              `Файлът е твърде голям. Максимум ${formatMegabytes(PRODUCT_IMAGE_MAX_INPUT_BYTES)}.`,
            );
            input.reportValidity();
            setStatus("error");
            setMessage(
              `„${oversized.name}“ надвишава ${formatMegabytes(PRODUCT_IMAGE_MAX_INPUT_BYTES)}.`,
            );
            syncInputFiles(previews);
            return;
          }

          const nextPreviews = [
            ...previews,
            ...files.map((file) => ({
              id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
              file,
              name: file.name,
              size: file.size,
              previewUrl: URL.createObjectURL(file),
            })),
          ];

          const duplicateNames = new Set<string>();
          const uniquePreviews = nextPreviews.filter((preview) => {
            const key = `${preview.file.name}-${preview.file.size}-${preview.file.lastModified}`;
            if (duplicateNames.has(key)) {
              URL.revokeObjectURL(preview.previewUrl);
              return false;
            }
            duplicateNames.add(key);
            return true;
          });

          input.setCustomValidity("");
          setPreviews(uniquePreviews);
          syncInputFiles(uniquePreviews);
          updateReadyMessage(uniquePreviews);
        }}
      />

      {previews.length > 0 ? (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {previews.map((preview) => (
            <li
              key={preview.id}
              className="overflow-hidden rounded-lg border border-boutique-line/70 bg-white"
            >
              <div className="relative aspect-[4/3] bg-boutique-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.previewUrl}
                  alt={preview.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-1 px-3 py-2 text-xs text-boutique-muted">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-medium text-boutique-ink">
                    {preview.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => removePreview(preview.id)}
                    className="shrink-0 rounded-full border border-boutique-line px-2 py-0.5 font-semibold text-boutique-ink transition hover:border-red-200 hover:text-red-700"
                  >
                    Махни
                  </button>
                </div>
                <p>Оригинал: {formatMegabytes(preview.size)}</p>
                <p>Ще бъде оптимизирано при качване</p>
                {altTextName ? (
                  <label className="block pt-2 text-left">
                    <span className="font-medium text-boutique-ink">
                      Alt текст (по желание)
                    </span>
                    <input
                      name={altTextName}
                      type="text"
                      maxLength={160}
                      placeholder="Кратко описание на снимката"
                      className="mt-1 w-full rounded-lg border border-boutique-line bg-boutique-paper px-3 py-2 text-xs text-boutique-ink outline-none transition focus:border-boutique-sage-deep focus:ring-2 focus:ring-boutique-sage/20"
                    />
                  </label>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <p
        className={`${helperClassName} ${status === "error" ? "text-red-700" : ""}`}
        role={status === "error" || pending ? "status" : undefined}
        aria-live={status === "error" || pending ? "polite" : undefined}
      >
        {pending
          ? "Качване и обработка на избраните снимки… Моля, изчакайте."
          : message}
      </p>
    </div>
  );
}
