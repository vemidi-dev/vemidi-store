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
  sourceFileName?: string;
};

export function formatImageFileError(message: string, sourceFileName?: string) {
  return sourceFileName ? `„${sourceFileName}“: ${message}` : message;
}

function throwImageFileError(message: string, sourceFileName?: string): never {
  throw new Error(formatImageFileError(message, sourceFileName));
}

function getShortEdge(width: number, height: number) {
  return Math.min(width, height);
}

function getLongEdge(width: number, height: number) {
  return Math.max(width, height);
}

function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateImageInputSize(
  size: number,
  profileId: ImageProfileId,
  sourceFileName?: string,
) {
  const profile = getImageProfile(profileId);

  if (size <= 0) {
    throw new Error(formatImageFileError("Файлът е празен или повреден.", sourceFileName));
  }

  if (size > profile.maxFileSize) {
    throw new Error(
      formatImageFileError(
        `Файлът надвишава максималния размер от ${formatMegabytes(profile.maxFileSize)}.`,
        sourceFileName,
      ),
    );
  }
}

export async function processImageBuffer(
  input: Buffer,
  originalSize: number,
  profileId: ImageProfileId,
  deps: ProcessImageDeps = {},
  sourceFileName?: string,
): Promise<ProcessedImage> {
  const profile = getImageProfile(profileId);
  validateImageInputSize(originalSize, profileId, sourceFileName);

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
    throwImageFileError("Файлът е повреден или неподдържан.", sourceFileName);
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await instance.metadata();
  } catch {
    throwImageFileError("Файлът е повреден или неподдържан.", sourceFileName);
  }

  const format = metadata.format?.toLowerCase();
  if (!format || !["jpeg", "png", "webp"].includes(format)) {
    throwImageFileError("Позволени са само JPEG, PNG и WebP изображения.", sourceFileName);
  }

  if ((metadata.pages ?? 1) > 1) {
    throwImageFileError("Анимираните изображения не се поддържат.", sourceFileName);
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
    throwImageFileError("Файлът е повреден или неподдържан.", sourceFileName);
  }

  const sourceWidth = orientedMetadata.width ?? 0;
  const sourceHeight = orientedMetadata.height ?? 0;
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throwImageFileError("Файлът е повреден или неподдържан.", sourceFileName);
  }

  const warnings: string[] = [];
  if (getShortEdge(sourceWidth, sourceHeight) < profile.minShortEdge) {
    throwImageFileError(
      profileId === "product"
        ? `Изображението е твърде малко (късата страна е под ${profile.minShortEdge} px). Изберете по-голяма снимка.`
        : `Изображението е твърде малко (късата страна е под ${profile.minShortEdge} px) и може да изглежда размазано.`,
      sourceFileName,
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
    throwImageFileError("Неуспешна обработка на изображението.", sourceFileName);
  }

  const width = output.info.width;
  const height = output.info.height;
  if (width <= 0 || height <= 0) {
    throwImageFileError("Неуспешна обработка на изображението.", sourceFileName);
  }

  if (getLongEdge(width, height) > profile.maxDimension) {
    throwImageFileError("Неуспешна обработка на изображението.", sourceFileName);
  }

  if (output.data.length > profile.maxFileSize) {
    throwImageFileError(
      `Оптимизираното изображение надвишава ${formatMegabytes(profile.maxFileSize)}. Използвайте по-малък файл.`,
      sourceFileName,
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
    sourceFileName,
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
    throw new Error(
      formatImageFileError("Позволени са само JPEG, PNG и WebP изображения.", file.name),
    );
  }

  validateImageInputSize(file.size, profileId, file.name);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return processImageBuffer(buffer, file.size, profileId, deps, file.name);
}
