import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_BUCKET = "product-images";

export type UploadedProductImage = {
  path: string;
  url: string;
};

type ImageFolder = "products" | "blog" | "events";

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : "bin";
}

export async function uploadAdminImage(
  supabase: SupabaseClient,
  file: File,
  folder: ImageFolder,
): Promise<UploadedProductImage> {
  const extension = getFileExtension(file.name);
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
