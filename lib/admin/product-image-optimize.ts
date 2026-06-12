import {
  processImageBuffer,
  processImageFile,
  validateImageInputSize,
  type ProcessImageDeps,
  type ProcessedImage,
} from "@/lib/images/process-image";

export type ProductImageOptimizeDeps = ProcessImageDeps;

export type OptimizedProductImage = ProcessedImage;

export function validateProductImageInputSize(size: number) {
  return validateImageInputSize(size, "product");
}

export async function optimizeProductImageBuffer(
  input: Buffer,
  originalSize: number,
  deps: ProductImageOptimizeDeps = {},
): Promise<OptimizedProductImage> {
  return processImageBuffer(input, originalSize, "product", deps);
}

export async function optimizeProductImageFile(
  file: File,
  deps: ProductImageOptimizeDeps = {},
): Promise<OptimizedProductImage> {
  return processImageFile(file, "product", deps);
}
