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
    url: getPublicImageUrl(path),
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

export async function copyProductImageFromStorage(
  supabase: SupabaseClient,
  sourceUrl: string,
): Promise<UploadedProductImage | null> {
  const path = getProductImagePath(sourceUrl);
  if (!path) {
    return null;
  }

  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).download(path);
  if (error || !data) {
    return null;
  }

  const extension = path.split(".").pop()?.toLowerCase() || "jpg";
  const contentType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";
  const file = new File(
    [await data.arrayBuffer()],
    `duplicate.${extension}`,
    { type: contentType },
  );

  try {
    return await uploadProductImage(supabase, file);
  } catch {
    return null;
  }
}

export function getPublicImageUrl(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) {
    throw new Error("Липсва конфигурация за публичните изображения.");
  }

  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${IMAGE_BUCKET}/${encodedPath}`;
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
