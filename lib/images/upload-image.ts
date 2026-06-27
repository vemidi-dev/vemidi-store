import type { SupabaseClient } from "@supabase/supabase-js";

import {
  IMAGE_BUCKET,
  IMAGE_CACHE_CONTROL,
  IMAGE_PROCESSING_CONCURRENCY,
} from "@/lib/images/constants";
import { processImageFile, type ProcessedImage, type ProcessImageDeps } from "@/lib/images/process-image";
import { getImageProfile, type ImageProfileId } from "@/lib/images/profiles";
import { buildImageStoragePath } from "@/lib/images/storage-path";
import { executeStorageUploadWithRetry } from "@/lib/images/storage-upload-retry";
import { getPublicImageUrl } from "@/lib/admin/storage";

export type UploadedImage = {
  path: string;
  url: string;
  imageId: string;
  originalSize: number;
  optimizedSize: number;
  profileId: ImageProfileId;
};

export type ImageStorageAdapter = {
  upload: (
    path: string,
    body: Buffer,
    options: { contentType: string; cacheControl: string },
  ) => Promise<{ error: Error | null }>;
  remove: (paths: string[]) => Promise<{ error: Error | null }>;
  list: (prefix: string) => Promise<{ paths: string[]; error: Error | null }>;
};

export type ImageUploadDeps = ProcessImageDeps & {
  storageAdapter?: ImageStorageAdapter;
};

function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateImageUploadBatch(
  profileId: ImageProfileId,
  files: File[],
  existingImageCount = 0,
) {
  const profile = getImageProfile(profileId);

  if (files.length > profile.maxFilesPerUpload) {
    return `Можете да качите най-много ${profile.maxFilesPerUpload} изображения наведнъж.`;
  }

  if (profile.maxImages !== undefined && existingImageCount + files.length > profile.maxImages) {
    return `Достигнат е лимитът от ${profile.maxImages} изображения.`;
  }

  for (const file of files) {
    if (!(file instanceof File)) {
      return "Невалиден файл за качване.";
    }

    if (file.size > profile.maxFileSize) {
      return `Файлът „${file.name}“ надвишава максималния размер от ${formatMegabytes(profile.maxFileSize)}.`;
    }

    if (
      file.type &&
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      return `Файлът „${file.name}“ не е позволен формат. Използвайте JPEG, PNG или WebP.`;
    }
  }

  return null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export function createSupabaseImageStorageAdapter(
  supabase: SupabaseClient,
): ImageStorageAdapter {
  return {
    async upload(path, body, options) {
      return executeStorageUploadWithRetry(async () => {
        const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, body, {
          contentType: options.contentType,
          cacheControl: options.cacheControl,
          upsert: false,
        });

        return { error: error ? new Error(error.message) : null };
      });
    },
    async remove(paths) {
      if (paths.length === 0) {
        return { error: null };
      }

      const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);
      return { error: error ? new Error(error.message) : null };
    },
    async list(prefix) {
      const { data, error } = await supabase.storage.from(IMAGE_BUCKET).list(prefix, {
        limit: 100,
      });

      if (error) {
        return { paths: [], error: new Error(error.message) };
      }

      const paths = (data ?? [])
        .filter((entry) => entry.name && entry.id)
        .map((entry) => `${prefix}/${entry.name}`);

      return { paths, error: null };
    },
  };
}

export async function uploadProcessedImage(
  adapter: ImageStorageAdapter,
  profileId: ImageProfileId,
  scopeId: string,
  processed: ProcessedImage,
): Promise<UploadedImage> {
  const path = buildImageStoragePath(profileId, scopeId, processed.imageId);
  const { error } = await adapter.upload(path, processed.buffer, {
    contentType: "image/webp",
    cacheControl: IMAGE_CACHE_CONTROL,
  });

  if (error) {
    const label = processed.sourceFileName ? `„${processed.sourceFileName}“: ` : "";
    throw new Error(`${label}Неуспешно качване на изображението: ${error.message}`);
  }

  return {
    path,
    url: getPublicImageUrl(path),
    imageId: processed.imageId,
    originalSize: processed.originalSize,
    optimizedSize: processed.optimizedSize,
    profileId,
  };
}

export function getUploadedImagePaths(images: UploadedImage[]) {
  return images.map((image) => image.path);
}

export async function deleteStoragePathsBestEffort(
  adapter: ImageStorageAdapter,
  paths: string[],
) {
  const unique = Array.from(new Set(paths.filter((path) => path.trim().length > 0)));
  if (unique.length === 0) {
    return { deletedPaths: unique, failedPaths: [], errorMessage: null };
  }

  const { error } = await adapter.remove(unique);
  if (error) {
    console.error("[upload-image] delete failed", {
      pathCount: unique.length,
      message: error.message,
    });
    return {
      deletedPaths: [],
      failedPaths: unique,
      errorMessage:
        "Изображенията не бяха напълно премахнати от хранилището. Опитайте отново или се свържете с администратор.",
    };
  }

  return { deletedPaths: unique, failedPaths: [], errorMessage: null };
}

export async function processImageFiles(
  profileId: ImageProfileId,
  files: File[],
  deps: ImageUploadDeps = {},
) {
  const validationError = validateImageUploadBatch(profileId, files);
  if (validationError) {
    throw new Error(validationError);
  }

  return mapWithConcurrency(files, IMAGE_PROCESSING_CONCURRENCY, async (file) => {
    try {
      return await processImageFile(file, profileId, deps);
    } catch (error) {
      if (error instanceof Error && error.message.includes(`„${file.name}“`)) {
        throw error;
      }
      const detail =
        error instanceof Error ? error.message : "Неуспешна обработка на изображението.";
      throw new Error(`„${file.name}“: ${detail}`);
    }
  });
}

export async function processAndUploadImages(
  supabase: SupabaseClient,
  profileId: ImageProfileId,
  scopeId: string,
  files: File[],
  existingImageCount = 0,
  deps: ImageUploadDeps = {},
): Promise<UploadedImage[]> {
  const validationError = validateImageUploadBatch(profileId, files, existingImageCount);
  if (validationError) {
    throw new Error(validationError);
  }

  const adapter = deps.storageAdapter ?? createSupabaseImageStorageAdapter(supabase);
  const processed = await processImageFiles(profileId, files, deps);
  const uploaded: UploadedImage[] = [];

  try {
    for (const image of processed) {
      uploaded.push(await uploadProcessedImage(adapter, profileId, scopeId, image));
    }
    return uploaded;
  } catch (error) {
    await deleteStoragePathsBestEffort(adapter, getUploadedImagePaths(uploaded));
    throw error;
  }
}
