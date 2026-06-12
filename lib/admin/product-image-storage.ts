import type { SupabaseClient } from "@supabase/supabase-js";

import { PRODUCT_IMAGE_CACHE_CONTROL } from "@/lib/admin/product-image-constants";
import { IMAGE_BUCKET } from "@/lib/images/constants";
import type { ImageStorageAdapter } from "@/lib/images/upload-image";
import {
  createSupabaseImageStorageAdapter,
  deleteStoragePathsBestEffort as deleteImageStoragePathsBestEffort,
} from "@/lib/images/upload-image";

const PRODUCT_IMAGE_BUCKET = IMAGE_BUCKET;
import {
  buildProductImageStoragePath,
  getProductStoragePrefix,
  isPathWithinProductScope,
} from "@/lib/admin/product-image-path";
import type { OptimizedProductImage } from "@/lib/admin/product-image-optimize";
import { getProductImagePath, getPublicImageUrl } from "@/lib/admin/storage";

export type UploadedProductImage = {
  path: string;
  url: string;
  imageId: string;
  originalSize: number;
  optimizedSize: number;
};

export type ProductImageStorageAdapter = ImageStorageAdapter;

export type StorageCleanupResult = {
  deletedPaths: string[];
  failedPaths: string[];
  errorMessage: string | null;
};

export function createSupabaseProductImageStorageAdapter(
  supabase: SupabaseClient,
): ProductImageStorageAdapter {
  return createSupabaseImageStorageAdapter(supabase);
}

export async function uploadOptimizedProductImage(
  adapter: ProductImageStorageAdapter,
  productId: string,
  optimized: OptimizedProductImage,
): Promise<UploadedProductImage> {
  const path = buildProductImageStoragePath(productId, optimized.imageId);
  const { error } = await adapter.upload(path, optimized.buffer, {
    contentType: "image/webp",
    cacheControl: PRODUCT_IMAGE_CACHE_CONTROL,
  });

  if (error) {
    throw new Error(`Неуспешно качване на изображението: ${error.message}`);
  }

  return {
    path,
    url: getPublicImageUrl(path),
    imageId: optimized.imageId,
    originalSize: optimized.originalSize,
    optimizedSize: optimized.optimizedSize,
  };
}

export async function deleteStoragePathsBestEffort(
  adapter: ProductImageStorageAdapter,
  paths: string[],
): Promise<StorageCleanupResult> {
  return deleteImageStoragePathsBestEffort(adapter, paths);
}

export async function deleteProductScopedStoragePaths(
  adapter: ProductImageStorageAdapter,
  productId: string,
  extraPaths: string[] = [],
): Promise<StorageCleanupResult> {
  const scopedPrefix = getProductStoragePrefix(productId);
  const scopedPaths = new Set<string>();

  const { paths: listedPaths, error: listError } = await adapter.list(scopedPrefix);
  if (listError) {
    console.error("[product-image-storage] list failed", {
      productId,
      message: listError.message,
    });
  } else {
    for (const path of listedPaths) {
      if (isPathWithinProductScope(path, productId)) {
        scopedPaths.add(path);
      }
    }
  }

  for (const path of extraPaths) {
    const storagePath = path.startsWith("http") ? getProductImagePath(path) : path;
    if (!storagePath || storagePath.includes("..")) {
      continue;
    }

    scopedPaths.add(storagePath);
  }

  return deleteStoragePathsBestEffort(adapter, Array.from(scopedPaths));
}

export function getUploadedImagePaths(images: UploadedProductImage[]) {
  return images.map((image) => image.path);
}

export async function copyProductImageToProduct(
  supabase: SupabaseClient,
  sourceUrl: string,
  targetProductId: string,
  deps: { storageAdapter?: ProductImageStorageAdapter } = {},
): Promise<UploadedProductImage | null> {
  const sourcePath = getProductImagePath(sourceUrl);
  if (!sourcePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .download(sourcePath);
  if (error || !data) {
    return null;
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const { processImageBuffer } = await import("@/lib/images/process-image");

  try {
    const optimized = await processImageBuffer(buffer, buffer.length, "product");
    const adapter =
      deps.storageAdapter ?? createSupabaseProductImageStorageAdapter(supabase);
    return await uploadOptimizedProductImage(adapter, targetProductId, optimized);
  } catch {
    return null;
  }
}
