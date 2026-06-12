import {
  buildImageStoragePath,
  getImageStoragePrefix,
  isPathWithinImageScope,
  isValidImageUuid,
} from "@/lib/images/storage-path";

export function isValidProductImageId(value: string) {
  return isValidImageUuid(value);
}

export function buildProductImageStoragePath(productId: string, imageId: string) {
  return buildImageStoragePath("product", productId, imageId);
}

export function getProductStoragePrefix(productId: string) {
  return getImageStoragePrefix("product", productId);
}

export function isPathWithinProductScope(path: string, productId: string) {
  return isPathWithinImageScope(path, "product", productId);
}
