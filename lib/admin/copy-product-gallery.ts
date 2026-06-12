import type { SupabaseClient } from "@supabase/supabase-js";

import {
  copyProductImageToProduct,
  createSupabaseProductImageStorageAdapter,
  deleteStoragePathsBestEffort,
  getUploadedImagePaths,
  type ProductImageStorageAdapter,
  type UploadedProductImage,
} from "@/lib/admin/product-image-storage";
import { getProductImagePath } from "@/lib/admin/storage";

export type SourceGalleryImage = {
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

export function normalizeSourceGalleryImages(
  galleryRows: SourceGalleryImage[],
  legacyImageUrl: string | null | undefined,
  fallbackAlt: string,
): SourceGalleryImage[] {
  if (galleryRows.length > 0) {
    return [...galleryRows].sort(
      (left, right) =>
        left.sort_order - right.sort_order ||
        Number(right.is_primary) - Number(left.is_primary),
    );
  }

  const legacyUrl = String(legacyImageUrl ?? "").trim();
  if (!legacyUrl) {
    return [];
  }

  return [
    {
      image_url: legacyUrl,
      alt_text: fallbackAlt,
      is_primary: true,
      sort_order: 0,
    },
  ];
}

export type CopiedGalleryPair = {
  source: SourceGalleryImage;
  uploaded: UploadedProductImage;
};

export function buildImportedGalleryPayload(
  pairs: CopiedGalleryPair[],
  fallbackAlt: string,
) {
  return pairs.map(({ source, uploaded }) => ({
    image_url: uploaded.url,
    alt_text: String(source.alt_text ?? "").trim() || fallbackAlt,
    sort_order: source.sort_order,
    is_primary: source.is_primary,
  }));
}

export function areDistinctProductImagePaths(
  sourceUrl: string,
  copied: UploadedProductImage,
  targetProductId: string,
) {
  const sourcePath = getProductImagePath(sourceUrl);
  return (
    copied.path !== sourcePath &&
    copied.path.startsWith(`products/${targetProductId}/`) &&
    sourcePath !== copied.path
  );
}

export async function copyProductGalleryImagesToProduct(
  supabase: SupabaseClient,
  sourceProductId: string,
  newProductId: string,
  fallbackAlt: string,
  deps: { storageAdapter?: ProductImageStorageAdapter } = {},
) {
  const [{ data: sourceImages }, { data: sourceProduct }] = await Promise.all([
    supabase
      .from("product_images")
      .select("image_url, alt_text, is_primary, sort_order")
      .eq("product_id", sourceProductId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("products")
      .select("image_url")
      .eq("id", sourceProductId)
      .maybeSingle(),
  ]);

  const imageSources = normalizeSourceGalleryImages(
    (sourceImages ?? []) as SourceGalleryImage[],
    sourceProduct?.image_url,
    fallbackAlt,
  );

  if (imageSources.length === 0) {
    return { copiedCount: 0, totalCount: 0, uploaded: [] as UploadedProductImage[] };
  }

  const adapter = deps.storageAdapter ?? createSupabaseProductImageStorageAdapter(supabase);
  const copiedPairs: CopiedGalleryPair[] = [];

  for (const image of imageSources) {
    const copied = await copyProductImageToProduct(
      supabase,
      image.image_url,
      newProductId,
      { storageAdapter: adapter },
    );
    if (copied) {
      copiedPairs.push({ source: image, uploaded: copied });
    }
  }

  const uploaded = copiedPairs.map((pair) => pair.uploaded);

  if (uploaded.length === 0) {
    return { copiedCount: 0, totalCount: imageSources.length, uploaded };
  }

  const importPayload = buildImportedGalleryPayload(copiedPairs, fallbackAlt);
  const { error } = await supabase.rpc("admin_import_product_images", {
    p_product_id: newProductId,
    p_images: importPayload,
  });

  if (error) {
    await deleteStoragePathsBestEffort(adapter, getUploadedImagePaths(uploaded));
    return { copiedCount: 0, totalCount: imageSources.length, uploaded: [] };
  }

  return {
    copiedCount: uploaded.length,
    totalCount: imageSources.length,
    uploaded,
  };
}
