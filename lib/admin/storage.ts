import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_BUCKET = "product-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type UploadedProductImage = {
  path: string;
  url: string;
};

type ImageFolder = "products" | "blog" | "events" | "events/gallery";

async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

export async function uploadAdminImage(
  supabase: SupabaseClient,
  file: File,
  folder: ImageFolder,
): Promise<UploadedProductImage> {
  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) {
    throw new Error("Позволени са само PNG, JPG и WEBP изображения.");
  }
  if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    throw new Error("Изображението трябва да бъде до 5 MB.");
  }
  if (!(await hasValidImageSignature(file))) {
    throw new Error("Файлът не съдържа валидно изображение.");
  }

  const path = `${folder}/${Date.now()}-${randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });

  if (error) {
    throw new Error(error.message);
  }

  return {
    path,
    url: supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl,
  };
}

export function uploadProductImage(supabase: SupabaseClient, file: File) {
  return uploadAdminImage(supabase, file, "products");
}

export function uploadEventGalleryImage(supabase: SupabaseClient, file: File) {
  return uploadAdminImage(supabase, file, "events/gallery");
}

export async function deleteProductImage(supabase: SupabaseClient, path: string) {
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
  if (error) {
    throw new Error(error.message);
  }
}

export function getProductImagePath(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) {
    return null;
  }

  try {
    const url = new URL(imageUrl);
    const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }

    const encodedPath = url.pathname.slice(markerIndex + marker.length);
    return encodedPath ? decodeURIComponent(encodedPath) : null;
  } catch {
    return null;
  }
}
