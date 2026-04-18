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
};

const ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function ImageFileInput({
  name,
  label,
  helperText,
  className,
  helperClassName,
  required = false,
  maxSizeMb = 5,
}: ImageFileInputProps) {
  const id = useId();
  const [message, setMessage] = useState(helperText);
  const maxBytes = maxSizeMb * 1024 * 1024;

  return (
    <label className="text-sm font-medium text-boutique-ink">
      {label}
      <input
        id={id}
        name={name}
        type="file"
        required={required}
        accept={ACCEPTED_MIME_TYPES.join(",")}
        className={className}
        onChange={(event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];

          if (!file) {
            input.setCustomValidity("");
            setMessage(helperText);
            return;
          }

          if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
            input.setCustomValidity("Позволени формати: PNG, JPG, WEBP или SVG.");
            input.reportValidity();
            setMessage("Невалиден формат. Изберете PNG, JPG, WEBP или SVG.");
            return;
          }

          if (file.size > maxBytes) {
            input.setCustomValidity(`Файлът е твърде голям. Максимум ${maxSizeMb} MB.`);
            input.reportValidity();
            setMessage(`Файлът е твърде голям. Максимум ${maxSizeMb} MB.`);
            return;
          }

          input.setCustomValidity("");
          setMessage(`Избран файл: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        }}
      />
      <p className={helperClassName}>{message}</p>
    </label>
  );
}
