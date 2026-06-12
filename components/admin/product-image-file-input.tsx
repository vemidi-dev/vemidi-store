"use client";

import { useEffect, useId, useMemo, useState } from "react";

import {
  PRODUCT_IMAGE_MAX_FILES_PER_UPLOAD,
  PRODUCT_IMAGE_MAX_INPUT_BYTES,
  PRODUCT_IMAGE_MAX_PER_PRODUCT,
} from "@/lib/admin/product-image-constants";

type ProductImageFileInputProps = {
  name: string;
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
  name: string;
  size: number;
  previewUrl: string;
};

export function ProductImageFileInput({
  name,
  label,
  className,
  helperClassName,
  existingGalleryCount = 0,
  helperText,
}: ProductImageFileInputProps) {
  const id = useId();
  const defaultHelper = useMemo(
    () =>
      helperText ??
      `PNG, JPG или WEBP до ${formatMegabytes(PRODUCT_IMAGE_MAX_INPUT_BYTES)}. Максимум ${PRODUCT_IMAGE_MAX_PER_PRODUCT} снимки на продукт. Снимките се оптимизират автоматично преди качване.`,
    [helperText],
  );
  const [message, setMessage] = useState(defaultHelper);
  const [status, setStatus] = useState<"idle" | "ready" | "error">("idle");
  const [previews, setPreviews] = useState<SelectedFilePreview[]>([]);
  const remainingSlots = Math.max(0, PRODUCT_IMAGE_MAX_PER_PRODUCT - existingGalleryCount);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
    };
  }, [previews]);

  return (
    <div>
      <p className="text-sm font-medium text-boutique-ink">{label}</p>
      <label
        htmlFor={id}
        className={`${className} mt-2 flex cursor-pointer flex-col items-center justify-center border-dashed bg-boutique-paper px-4 py-6 text-center transition hover:border-boutique-accent/50 hover:bg-boutique-bg`}
      >
        <span className="text-sm font-semibold text-boutique-ink">Избери снимки</span>
        <span className="mt-1 text-xs text-boutique-muted">PNG, JPG или WEBP</span>
      </label>
      <input
        id={id}
        name={name}
        type="file"
        multiple
        accept={ACCEPTED_MIME_TYPES.join(",")}
        className="sr-only"
        onChange={(event) => {
          const input = event.currentTarget;
          const files = Array.from(input.files ?? []);

          setPreviews((current) => {
            current.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
            return [];
          });

          if (files.length === 0) {
            input.setCustomValidity("");
            setStatus("idle");
            setMessage(defaultHelper);
            return;
          }

          if (files.length > PRODUCT_IMAGE_MAX_FILES_PER_UPLOAD) {
            input.setCustomValidity(
              `Изберете най-много ${PRODUCT_IMAGE_MAX_FILES_PER_UPLOAD} снимки наведнъж.`,
            );
            input.reportValidity();
            setStatus("error");
            setMessage(
              `Избрани са твърде много файлове. Максимум наведнъж: ${PRODUCT_IMAGE_MAX_FILES_PER_UPLOAD}.`,
            );
            return;
          }

          if (existingGalleryCount + files.length > PRODUCT_IMAGE_MAX_PER_PRODUCT) {
            input.setCustomValidity(
              `Продуктът може да има най-много ${PRODUCT_IMAGE_MAX_PER_PRODUCT} снимки.`,
            );
            input.reportValidity();
            setStatus("error");
            setMessage(
              `Можете да добавите още най-много ${remainingSlots} снимки към този продукт.`,
            );
            return;
          }

          const invalidType = files.find((file) => !ACCEPTED_MIME_TYPES.includes(file.type));
          if (invalidType) {
            input.setCustomValidity("Позволени формати: PNG, JPG или WEBP.");
            input.reportValidity();
            setStatus("error");
            setMessage("Невалиден формат. Изберете PNG, JPG или WEBP.");
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
            return;
          }

          const nextPreviews = files.map((file) => ({
            name: file.name,
            size: file.size,
            previewUrl: URL.createObjectURL(file),
          }));

          input.setCustomValidity("");
          setStatus("ready");
          setPreviews(nextPreviews);
          setMessage(
            `Избрани ${files.length} файла. Общ размер: ${formatMegabytes(
              files.reduce((sum, file) => sum + file.size, 0),
            )}. След изпращане ще бъдат обработени и конвертирани в WebP.`,
          );
        }}
      />

      {previews.length > 0 ? (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {previews.map((preview) => (
            <li
              key={preview.previewUrl}
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
                <p className="truncate font-medium text-boutique-ink">{preview.name}</p>
                <p>Оригинал: {formatMegabytes(preview.size)}</p>
                <p>Ще бъде оптимизирано при качване</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <p
        className={`${helperClassName} ${status === "error" ? "text-red-700" : ""}`}
        role={status === "error" ? "alert" : undefined}
      >
        {message}
      </p>
    </div>
  );
}
