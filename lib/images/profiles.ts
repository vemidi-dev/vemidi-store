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
  maxImages?: number;
  maxFilesPerUpload: number;
  storageDirectory: string;
};

export const IMAGE_PROFILES: Record<ImageProfileId, ImageProfileConfig> = {
  product: {
    id: "product",
    maxDimension: 1800,
    quality: 84,
    maxFileSize: 15 * 1024 * 1024,
    minShortEdge: 700,
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
    maxFilesPerUpload: 1,
    storageDirectory: "categories",
  },
  blog: {
    id: "blog",
    maxDimension: 1600,
    quality: 81,
    maxFileSize: 12 * 1024 * 1024,
    minShortEdge: 600,
    maxFilesPerUpload: 1,
    storageDirectory: "blog",
  },
  hero: {
    id: "hero",
    maxDimension: 2000,
    quality: 84,
    maxFileSize: 15 * 1024 * 1024,
    minShortEdge: 800,
    maxFilesPerUpload: 1,
    storageDirectory: "site-content",
  },
};

export function getImageProfile(profileId: ImageProfileId) {
  return IMAGE_PROFILES[profileId];
}

export function getMaxInputPixels(profileId: ImageProfileId) {
  const profile = getImageProfile(profileId);
  return profile.maxDimension * profile.maxDimension * 2;
}
