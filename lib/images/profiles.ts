export type ImageProfileId =
  | "product"
  | "event_gallery"
  | "category"
  | "blog"
  | "hero";

export type ImageProfileConfig = {
  id: ImageProfileId;
  maxDimension: number;
  quality: number;
  maxFileSize: number;
  minShortEdge: number;
  maxInputPixels: number;
  maxImages?: number;
  maxFilesPerUpload: number;
  storageDirectory: string;
};

/** ~24 MP — covers typical 12–20 MP phone photos before resize to maxDimension. */
export const PRODUCT_MAX_INPUT_PIXELS = 24_000_000;

function defaultMaxInputPixels(maxDimension: number) {
  return maxDimension * maxDimension * 2;
}

export const IMAGE_PROFILES: Record<ImageProfileId, ImageProfileConfig> = {
  product: {
    id: "product",
    maxDimension: 1800,
    quality: 84,
    maxFileSize: 10 * 1024 * 1024,
    minShortEdge: 480,
    maxInputPixels: PRODUCT_MAX_INPUT_PIXELS,
    maxImages: 12,
    maxFilesPerUpload: 12,
    storageDirectory: "products",
  },
  event_gallery: {
    id: "event_gallery",
    maxDimension: 1400,
    quality: 77,
    maxFileSize: 10 * 1024 * 1024,
    minShortEdge: 500,
    maxInputPixels: defaultMaxInputPixels(1400),
    maxImages: 30,
    maxFilesPerUpload: 12,
    storageDirectory: "events",
  },
  category: {
    id: "category",
    maxDimension: 1400,
    quality: 80,
    maxFileSize: 10 * 1024 * 1024,
    minShortEdge: 600,
    maxInputPixels: defaultMaxInputPixels(1400),
    maxFilesPerUpload: 1,
    storageDirectory: "categories",
  },
  blog: {
    id: "blog",
    maxDimension: 1600,
    quality: 81,
    maxFileSize: 12 * 1024 * 1024,
    minShortEdge: 600,
    maxInputPixels: defaultMaxInputPixels(1600),
    maxFilesPerUpload: 1,
    storageDirectory: "blog",
  },
  hero: {
    id: "hero",
    maxDimension: 2000,
    quality: 84,
    maxFileSize: 15 * 1024 * 1024,
    minShortEdge: 800,
    maxInputPixels: defaultMaxInputPixels(2000),
    maxFilesPerUpload: 1,
    storageDirectory: "site-content",
  },
};

export function getImageProfile(profileId: ImageProfileId) {
  return IMAGE_PROFILES[profileId];
}

export function getMaxInputPixels(profileId: ImageProfileId) {
  return getImageProfile(profileId).maxInputPixels;
}
