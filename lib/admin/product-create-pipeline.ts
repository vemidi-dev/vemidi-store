import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import {
  createProductAtomic,
  getProductMutationErrorMessage,
  type ProductMutationInput,
} from "@/lib/admin/product-rpc";
import {
  createSupabaseProductImageStorageAdapter,
  deleteStoragePathsBestEffort,
  getUploadedImagePaths,
  type UploadedProductImage,
} from "@/lib/admin/product-image-storage";
import {
  processAndUploadProductImages,
  validateProductImageUploadBatch,
} from "@/lib/admin/product-image-upload";
import type { ProductQuantityPriceTier } from "@/lib/product-quantity-pricing";
import type { ProductVisibility } from "@/lib/product-visibility";

export type ProductDraftPostCreateUpdate = {
  visibility: ProductVisibility;
  showQuantitySelector: boolean;
  promoCodeEligible?: boolean;
  quantityPriceTiers: ProductQuantityPriceTier[] | null;
  personalizationOpenByDefault: boolean | null;
};

export type CreateProductDraftWithGalleryInput = {
  mutationInput: ProductMutationInput;
  postCreate: ProductDraftPostCreateUpdate;
  imageFiles: File[];
  imageAltTexts: string[];
};

export type CreateProductDraftStage = "create" | "status" | "upload" | "gallery";

export type CreateProductDraftWithGalleryResult =
  | {
      ok: true;
      productId: string;
      imageCount: number;
      uploadedImages: UploadedProductImage[];
    }
  | {
      ok: false;
      stage: CreateProductDraftStage;
      productId?: string;
      message: string;
      uploadedImages?: UploadedProductImage[];
    };

export async function attachProductGalleryImages(
  supabase: SupabaseClient,
  productId: string,
  images: UploadedProductImage[],
  altTexts: string[] = [],
): Promise<PostgrestError | null> {
  if (images.length === 0) {
    return null;
  }

  const { error } = await supabase.rpc("admin_attach_product_images", {
    p_product_id: productId,
    p_images: images.map((image, index) => ({
      image_url: image.url,
      alt_text: altTexts[index]?.trim() || null,
    })),
  });

  return error;
}

export async function deleteUploadedProductImagesBestEffort(
  supabase: SupabaseClient,
  images: UploadedProductImage[],
) {
  const adapter = createSupabaseProductImageStorageAdapter(supabase);
  await deleteStoragePathsBestEffort(adapter, getUploadedImagePaths(images));
}

export function formatGalleryAttachErrorMessage(errorMessage: string) {
  const migrationMissing = errorMessage.includes("admin_attach_product_images");
  return migrationMissing
    ? "Продуктът е създаден, но галерията не беше записана. Изпълнете product_image_gallery.sql и добавете снимките от секцията „Галерия“."
    : "Продуктът е създаден, но снимките не бяха записани в галерията. Опитайте отново от секцията „Галерия“.";
}

export async function createProductDraftWithGallery(
  supabase: SupabaseClient,
  input: CreateProductDraftWithGalleryInput,
): Promise<CreateProductDraftWithGalleryResult> {
  const { mutationInput, postCreate, imageFiles, imageAltTexts } = input;

  const { data: productId, error: mutationError } = await createProductAtomic(
    supabase,
    mutationInput,
  );

  if (mutationError || !productId) {
    return {
      ok: false,
      stage: "create",
      message: getProductMutationErrorMessage(mutationError),
    };
  }

  const newProductId = String(productId);
  const updatePayload: Record<string, unknown> = {
    status: "draft",
    visibility: postCreate.visibility,
    show_quantity_selector: postCreate.showQuantitySelector,
    quantity_price_tiers: postCreate.quantityPriceTiers,
    personalization_open_by_default: postCreate.personalizationOpenByDefault,
  };

  if (typeof postCreate.promoCodeEligible === "boolean") {
    updatePayload.promo_code_eligible = postCreate.promoCodeEligible;
  }

  const { error: statusError } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", newProductId);

  if (statusError) {
    return {
      ok: false,
      stage: "status",
      productId: newProductId,
      message: "Продуктът е създаден, но статусът не беше зададен като чернова.",
    };
  }

  if (imageFiles.length === 0) {
    return {
      ok: true,
      productId: newProductId,
      imageCount: 0,
      uploadedImages: [],
    };
  }

  const galleryUploadError = await validateProductImageUploadBatch(imageFiles, 0);
  if (galleryUploadError) {
    return {
      ok: false,
      stage: "upload",
      productId: newProductId,
      message: galleryUploadError,
    };
  }

  let uploadedImages: UploadedProductImage[] = [];
  try {
    uploadedImages = await processAndUploadProductImages(
      supabase,
      newProductId,
      imageFiles,
      0,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неуспешно качване на изображението.";
    return {
      ok: false,
      stage: "upload",
      productId: newProductId,
      message: `Продуктът е създаден, но снимките не бяха качени: ${message}. Изберете ги отново в секцията „Галерия“ по-долу.`,
    };
  }

  const galleryError = await attachProductGalleryImages(
    supabase,
    newProductId,
    uploadedImages,
    imageAltTexts,
  );
  if (galleryError) {
    await deleteUploadedProductImagesBestEffort(supabase, uploadedImages);
    return {
      ok: false,
      stage: "gallery",
      productId: newProductId,
      message: formatGalleryAttachErrorMessage(galleryError.message),
      uploadedImages,
    };
  }

  return {
    ok: true,
    productId: newProductId,
    imageCount: uploadedImages.length,
    uploadedImages,
  };
}
