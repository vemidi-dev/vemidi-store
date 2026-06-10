"use client";

import { useId, useState } from "react";

type ImageFileInputProps = {
  name: string;
  label: string;
  helperText: string;
  className: string;
  helperClassName: string;
  required?: boolean;
  maxSizeMb?: number;
  multiple?: boolean;
  maxFiles?: number;
  maxTotalSizeMb?: number;
};

const ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function ImageFileInput({
  name,
  label,
  helperText,
  className,
  helperClassName,
  required = false,
  maxSizeMb = 5,
  multiple = false,
  maxFiles = 8,
  maxTotalSizeMb = 9,
}: ImageFileInputProps) {
  const id = useId();
  const [message, setMessage] = useState(helperText);
  const maxBytes = maxSizeMb * 1024 * 1024;
  const maxTotalBytes = maxTotalSizeMb * 1024 * 1024;

  return (
    <label className="text-sm font-medium text-boutique-ink">
      {label}
      <input
        id={id}
        name={name}
        type="file"
        multiple={multiple}
        required={required}
        accept={ACCEPTED_MIME_TYPES.join(",")}
        className={className}
        onChange={(event) => {
          const input = event.currentTarget;
          const files = Array.from(input.files ?? []);

          if (files.length === 0) {
            input.setCustomValidity("");
            setMessage(helperText);
            return;
          }

          if (multiple && files.length > maxFiles) {
            input.setCustomValidity(`Изберете най-много ${maxFiles} снимки наведнъж.`);
            input.reportValidity();
            setMessage(`Избрани са твърде много файлове. Максимум: ${maxFiles}.`);
            return;
          }

          const invalidType = files.find((file) => !ACCEPTED_MIME_TYPES.includes(file.type));
          if (invalidType) {
            input.setCustomValidity("Позволени формати: PNG, JPG или WEBP.");
            input.reportValidity();
            setMessage("Невалиден формат. Изберете PNG, JPG или WEBP.");
            return;
          }

          const oversized = files.find((file) => file.size > maxBytes);
          if (oversized) {
            input.setCustomValidity(`Файлът е твърде голям. Максимум ${maxSizeMb} MB.`);
            input.reportValidity();
            setMessage(`Файлът е твърде голям. Максимум ${maxSizeMb} MB.`);
            return;
          }

          const totalSize = files.reduce((sum, file) => sum + file.size, 0);
          if (multiple && totalSize > maxTotalBytes) {
            input.setCustomValidity(
              `Общият размер трябва да бъде до ${maxTotalSizeMb} MB.`,
            );
            input.reportValidity();
            setMessage(`Общият размер е над ${maxTotalSizeMb} MB.`);
            return;
          }

          input.setCustomValidity("");
          setMessage(
            multiple
              ? `Избрани файлове: ${files.length}`
              : `Избран файл: ${files[0].name} (${(files[0].size / 1024 / 1024).toFixed(2)} MB)`,
          );
        }}
      />
      <p className={helperClassName}>{message}</p>
    </label>
  );
}
