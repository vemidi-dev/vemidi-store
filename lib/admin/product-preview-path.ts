export function getAdminProductPreviewPath(productId: string): string {
  return `/admin/products/${encodeURIComponent(productId)}/preview`;
}

export function isAdminProductPreviewPath(pathname: string): boolean {
  return /^\/admin\/products\/[^/]+\/preview\/?$/.test(pathname);
}
