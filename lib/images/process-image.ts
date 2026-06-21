import { randomUUID } from "node:crypto";

import type sharp from "sharp";

import { IMAGE_ACCEPTED_MIME_TYPES } from "@/lib/images/constants";
import { loadSharp } from "@/lib/images/load-sharp";
import {
  getImageProfile,
  getMaxInputPixels,
  type ImageProfileId,
} from "@/lib/images/profiles";

export type ProcessImageDeps = {
  sharpFactory?: typeof sharp;
};

export type ProcessedImage = {
  profileId: ImageProfileId;
  imageId: string;
  buffer: Buffer;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  warnings: string[];
};

function getShortEdge(width: number, height: number) {
  return Math.min(width, height);
}

function getLongEdge(width: number, height: number) {
  return Math.max(width, height);
}

function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateImageInputSize(size: number, profileId: ImageProfileId) {
  const profile = getImageProfile(profileId);

  if (size <= 0) {
    throw new Error("Файлът е празен или повреден.");
  }

  if (size > profile.maxFileSize) {
    throw new Error(
      `Файлът надвишава максималния размер от ${formatMegabytes(profile.maxFileSize)}.`,
    );
  }
}

export async function processImageBuffer(
  input: Buffer,
  originalSize: number,
  profileId: ImageProfileId,
  deps: ProcessImageDeps = {},
): Promise<ProcessedImage> {
  const profile = getImageProfile(profileId);
  validateImageInputSize(originalSize, profileId);

  const sharpFactory = deps.sharpFactory ?? loadSharp();
  const imageId = randomUUID();
  const maxPixels = getMaxInputPixels(profileId);

  let instance: sharp.Sharp;
  try {
    instance = sharpFactory(input, {
      failOn: "error",
      animated: false,
      limitInputPixels: maxPixels,
    });
  } catch {
    throw new Error("Файлът е повреден или неподдържан.");
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await instance.metadata();
  } catch {
    throw new Error("Файлът е повреден или неподдържан.");
  }

  const format = metadata.format?.toLowerCase();
  if (!format || !["jpeg", "png", "webp"].includes(format)) {
    throw new Error("Позволени са само JPEG, PNG и WebP изображения.");
  }

  if ((metadata.pages ?? 1) > 1) {
    throw new Error("Анимираните изображения не се поддържат.");
  }

  const oriented = sharpFactory(input, {
    failOn: "error",
    animated: false,
    limitInputPixels: maxPixels,
  }).rotate();

  let orientedMetadata: sharp.Metadata;
  try {
    orientedMetadata = await oriented.metadata();
  } catch {
    throw new Error("Файлът е повреден или неподдържан.");
  }

  const sourceWidth = orientedMetadata.width ?? 0;
  const sourceHeight = orientedMetadata.height ?? 0;
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Файлът е повреден или неподдържан.");
  }

  const warnings: string[] = [];
  if (getShortEdge(sourceWidth, sourceHeight) < profile.minShortEdge) {
    throw new Error(
      profileId === "product"
        ? `Изображението е твърде малко (късата страна е под ${profile.minShortEdge} px). Изберете по-голяма снимка.`
        : `Изображението е твърде малко (късата страна е под ${profile.minShortEdge} px) и може да изглежда размазано.`,
    );
  }

  let output: { data: Buffer; info: sharp.OutputInfo };
  try {
    output = await oriented
      .resize(profile.maxDimension, profile.maxDimension, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: profile.quality,
        effort: 4,
      })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new Error("Неуспешна обработка на изображението.");
  }

  const width = output.info.width;
  const height = output.info.height;
  if (width <= 0 || height <= 0) {
    throw new Error("Неуспешна обработка на изображението.");
  }

  if (getLongEdge(width, height) > profile.maxDimension) {
    throw new Error("Неуспешна обработка на изображението.");
  }

  if (output.data.length > profile.maxFileSize) {
    throw new Error(
      `Оптимизираното изображение надвишава ${formatMegabytes(profile.maxFileSize)}. Използвайте по-малък файл.`,
    );
  }

  return {
    profileId,
    imageId,
    buffer: output.data,
    width,
    height,
    originalSize,
    optimizedSize: output.data.length,
    warnings,
  };
}

export async function processImageFile(
  file: File,
  profileId: ImageProfileId,
  deps: ProcessImageDeps = {},
): Promise<ProcessedImage> {
  if (!(file instanceof File)) {
    throw new Error("Невалиден файл за качване.");
  }

  if (file.type && !IMAGE_ACCEPTED_MIME_TYPES.includes(file.type as (typeof IMAGE_ACCEPTED_MIME_TYPES)[number])) {
    throw new Error("Позволени са само JPEG, PNG и WebP изображения.");
  }

  validateImageInputSize(file.size, profileId);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return processImageBuffer(buffer, file.size, profileId, deps);
}
