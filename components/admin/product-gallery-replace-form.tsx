"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { replaceProductGalleryImage } from "@/app/admin/actions";
import { adminFormFields } from "@/lib/admin/form-fields";
import { PRODUCT_IMAGE_MAX_INPUT_BYTES } from "@/lib/admin/product-image-constants";

const ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

type ProductGalleryReplaceFormProps = {
  productId: string;
  imageId: string;
};

function ReplaceSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-boutique-line px-3 py-1.5 text-xs font-semibold text-boutique-ink disabled:opacity-60"
    >
      {pending ? "Замяна…" : "Замени снимката"}
    </button>
  );
}

export function ProductGalleryReplaceForm({
  productId,
  imageId,
}: ProductGalleryReplaceFormProps) {
  const inputId = useId();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form action={replaceProductGalleryImage} className="mt-3 space-y-2">
      <input type="hidden" name={adminFormFields.common.id} value={productId} />
      <input type="hidden" name={adminFormFields.productImage.imageId} value={imageId} />
      <label htmlFor={inputId} className="block text-xs font-medium text-boutique-ink">
        Нова снимка
      </label>
      <input
        id={inputId}
        name={adminFormFields.productImage.replaceFile}
        type="file"
        required
        accept={ACCEPTED_MIME_TYPES.join(",")}
        className="block w-full text-xs text-boutique-muted file:mr-3 file:rounded-full file:border-0 file:bg-boutique-bg file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-boutique-ink"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) {
            setMessage(null);
            return;
          }

          if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
            setMessage("Позволени формати: PNG, JPG или WEBP.");
            return;
          }

          if (file.size > PRODUCT_IMAGE_MAX_INPUT_BYTES) {
            setMessage("Файлът е твърде голям. Максимум 15 MB.");
            return;
          }

          setMessage(`Избран файл: ${file.name}`);
        }}
      />
      {message ? <p className="text-xs text-boutique-muted">{message}</p> : null}
      <ReplaceSubmitButton />
    </form>
  );
}
