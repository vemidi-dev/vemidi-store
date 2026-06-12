import type { SupabaseClient } from "@supabase/supabase-js";

import type { OptimizedProductImage, ProductImageOptimizeDeps } from "@/lib/admin/product-image-optimize";
import {
  createSupabaseProductImageStorageAdapter,
  uploadOptimizedProductImage,
  type ProductImageStorageAdapter,
  type UploadedProductImage,
} from "@/lib/admin/product-image-storage";
import {
  processAndUploadImages,
  processImageFiles,
  validateImageUploadBatch,
} from "@/lib/images/upload-image";

export type ProductImageUploadDeps = ProductImageOptimizeDeps & {
  storageAdapter?: ProductImageStorageAdapter;
};

export function validateProductImageUploadBatch(
  files: File[],
  existingImageCount = 0,
) {
  return validateImageUploadBatch("product", files, existingImageCount);
}

export async function processProductImageFiles(
  files: File[],
  deps: ProductImageUploadDeps = {},
): Promise<OptimizedProductImage[]> {
  return processImageFiles("product", files, deps);
}

export async function uploadProcessedProductImages(
  adapter: ProductImageStorageAdapter,
  productId: string,
  processedImages: OptimizedProductImage[],
): Promise<UploadedProductImage[]> {
  const uploaded: UploadedProductImage[] = [];

  for (const processed of processedImages) {
    uploaded.push(await uploadOptimizedProductImage(adapter, productId, processed));
  }

  return uploaded;
}

export async function processAndUploadProductImages(
  supabase: SupabaseClient,
  productId: string,
  files: File[],
  existingImageCount = 0,
  deps: ProductImageUploadDeps = {},
): Promise<UploadedProductImage[]> {
  const adapter = deps.storageAdapter ?? createSupabaseProductImageStorageAdapter(supabase);
  const images = await processAndUploadImages(
    supabase,
    "product",
    productId,
    files,
    existingImageCount,
    { ...deps, storageAdapter: adapter },
  );

  return images.map((image) => ({
    path: image.path,
    url: image.url,
    imageId: image.imageId,
    originalSize: image.originalSize,
    optimizedSize: image.optimizedSize,
  }));
}
