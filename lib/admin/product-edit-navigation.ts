export function productEditAnchorId(productId: string): string {
  return `product-${productId}`;
}

export function productGalleryAnchorId(productId: string): string {
  return `${productEditAnchorId(productId)}-gallery`;
}

export function resolveProductEditScrollTargetId(
  productId: string,
  hash: string,
): string {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!normalizedHash) {
    return productEditAnchorId(productId);
  }

  if (
    normalizedHash === productEditAnchorId(productId) ||
    normalizedHash === productGalleryAnchorId(productId)
  ) {
    return normalizedHash;
  }

  return productEditAnchorId(productId);
}
