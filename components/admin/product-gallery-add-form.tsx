"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import {
  addProductGalleryImages,
  attachUploadedProductGalleryImages,
} from "@/app/admin/actions";
import { AdminFormPendingGuard } from "@/components/admin/admin-form-pending-guard";
import { ProductImageFileInput } from "@/components/admin/product-image-file-input";
import { adminFieldClass, adminHelperClass } from "@/components/admin/styles";
import {
  PRODUCT_IMAGE_MAX_INPUT_BYTES,
  PRODUCT_IMAGE_MAX_LONG_EDGE,
  PRODUCT_IMAGE_MAX_PIXELS,
  PRODUCT_IMAGE_MIN_SHORT_EDGE,
  PRODUCT_IMAGE_WEBP_QUALITY,
} from "@/lib/admin/product-image-constants";
import { adminFormFields } from "@/lib/admin/form-fields";
import { IMAGE_BUCKET, IMAGE_CACHE_CONTROL } from "@/lib/images/constants";
import { createClient } from "@/lib/supabase/client";

type ProductGalleryAddFormProps = {
  productId: string;
  productName: string;
  existingGalleryCount: number;
};

const MAX_OPTIMIZED_IMAGE_BYTES = 5 * 1024 * 1024;

function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(`"${file.name}": файлът е повреден или не се поддържа.`);
  }
}

async function optimizeProductImageInBrowser(file: File) {
  if (file.size <= 0 || file.size > PRODUCT_IMAGE_MAX_INPUT_BYTES) {
    throw new Error(
      `"${file.name}": файлът трябва да бъде до ${formatMegabytes(PRODUCT_IMAGE_MAX_INPUT_BYTES)}.`,
    );
  }

  const image = await loadImage(file);
  try {
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error(`"${file.name}": файлът е повреден или не се поддържа.`);
    }
    if (sourceWidth * sourceHeight > PRODUCT_IMAGE_MAX_PIXELS) {
      throw new Error(`"${file.name}": снимката е с твърде голяма резолюция.`);
    }
    if (Math.min(sourceWidth, sourceHeight) < PRODUCT_IMAGE_MIN_SHORT_EDGE) {
      throw new Error(`"${file.name}": снимката е твърде малка.`);
    }

    const scale = Math.min(1, PRODUCT_IMAGE_MAX_LONG_EDGE / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(`"${file.name}": снимката не може да бъде обработена.`);
    }

    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", PRODUCT_IMAGE_WEBP_QUALITY / 100);
    });
    if (!blob) {
      throw new Error(`"${file.name}": снимката не може да бъде оптимизирана.`);
    }
    if (blob.size > MAX_OPTIMIZED_IMAGE_BYTES) {
      throw new Error(`"${file.name}": оптимизираната снимка надвишава 5 MB.`);
    }

    return blob;
  } finally {
    URL.revokeObjectURL(image.src);
  }
}

export function ProductGalleryAddForm({
  productId,
  productName,
  existingGalleryCount,
}: ProductGalleryAddFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isUploading) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const files = formData
      .getAll(adminFormFields.product.imageFiles)
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      setUploadError("Изберете поне една снимка за качване.");
      return;
    }

    const altTexts = formData
      .getAll(adminFormFields.product.imageAltTexts)
      .map((value) => String(value ?? "").trim());
    const supabase = createClient();
    const uploadedPaths: string[] = [];

    setIsUploading(true);
    setUploadError(null);
    setUploadMessage(`Обработка и качване на ${files.length} снимки...`);

    try {
      for (const [index, file] of files.entries()) {
        setUploadMessage(`Обработка на снимка ${index + 1} от ${files.length}...`);
        const optimized = await optimizeProductImageInBrowser(file);
        const path = `products/${productId}/${crypto.randomUUID()}.webp`;
        setUploadMessage(`Качване на снимка ${index + 1} от ${files.length}...`);
        const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, optimized, {
          contentType: "image/webp",
          cacheControl: IMAGE_CACHE_CONTROL,
          upsert: false,
        });

        if (error) {
          throw new Error(error.message);
        }
        uploadedPaths.push(path);
      }

      setUploadMessage("Записване на снимките към галерията...");
      const result = await attachUploadedProductGalleryImages({
        productId,
        images: uploadedPaths.map((path, index) => ({
          path,
          altText: altTexts[index] ?? null,
        })),
      });

      if (!result.ok) {
        throw new Error(result.message);
      }

      window.location.assign(
        result.redirectUrl ??
          `/admin?success=${encodeURIComponent(result.message)}&tab=products&editProduct=${encodeURIComponent(productId)}#product-${productId}-gallery`,
      );
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(IMAGE_BUCKET).remove(uploadedPaths);
      }
      setUploadError(
        error instanceof Error
          ? error.message
          : "Снимките не бяха качени. Опитайте отново.",
      );
      setUploadMessage(null);
      setIsUploading(false);
    }
  }

  return (
    <form
      action={addProductGalleryImages}
      onSubmit={handleSubmit}
      className="mt-4 space-y-3 rounded-xl border border-boutique-line/70 bg-white p-4"
    >
      <input type="hidden" name={adminFormFields.common.tab} value="products" />
      <input type="hidden" name={adminFormFields.common.id} value={productId} />
      <input type="hidden" name={adminFormFields.product.name} value={productName} />
      <ProductImageFileInput
        name={adminFormFields.product.imageFiles}
        altTextName={adminFormFields.product.imageAltTexts}
        label="Добави снимки"
        className={adminFieldClass}
        helperClassName={adminHelperClass}
        existingGalleryCount={existingGalleryCount}
        helperText="Новите снимки се добавят към галерията без да заменят съществуващите."
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isUploading}
          className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isUploading ? "Обработка и качване..." : "Добави снимки"}
        </button>
      </div>
      {uploadMessage ? (
        <p role="status" className={adminHelperClass}>
          {uploadMessage}
        </p>
      ) : null}
      {uploadError ? (
        <p role="alert" className={`${adminHelperClass} text-red-700`}>
          {uploadError}
        </p>
      ) : null}
      <AdminFormPendingGuard message="Обработка и качване на снимки... Моля, не затваряйте страницата." />
    </form>
  );
}
