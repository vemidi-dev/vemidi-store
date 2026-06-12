import { IMAGE_CACHE_CONTROL, IMAGE_PROCESSING_CONCURRENCY } from "@/lib/images/constants";
import { getImageProfile } from "@/lib/images/profiles";

const productProfile = getImageProfile("product");

export const PRODUCT_IMAGE_BUCKET = "product-images";

export const PRODUCT_IMAGE_MAX_INPUT_BYTES = productProfile.maxFileSize;
export const PRODUCT_IMAGE_MAX_PER_PRODUCT = productProfile.maxImages ?? 12;
export const PRODUCT_IMAGE_MAX_FILES_PER_UPLOAD = productProfile.maxFilesPerUpload;
export const PRODUCT_IMAGE_MAX_LONG_EDGE = productProfile.maxDimension;
export const PRODUCT_IMAGE_MIN_SHORT_EDGE = productProfile.minShortEdge;
export const PRODUCT_IMAGE_WEBP_QUALITY = productProfile.quality;
export const PRODUCT_IMAGE_PROCESSING_CONCURRENCY = IMAGE_PROCESSING_CONCURRENCY;
export const PRODUCT_IMAGE_MAX_PIXELS = productProfile.maxDimension * productProfile.maxDimension * 2;
export const PRODUCT_IMAGE_CACHE_CONTROL = IMAGE_CACHE_CONTROL;

export const PRODUCT_IMAGE_ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
