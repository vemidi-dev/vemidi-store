"use client";

import { getImageProfile } from "@/lib/images/profiles";

const profile = getImageProfile("event_gallery");
export const EVENT_GALLERY_SOURCE_MAX_BYTES = 50 * 1024 * 1024;
export const EVENT_GALLERY_TARGET_BYTES = 250 * 1024;
const acceptedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export function validateEventGallerySelection(files: File[]) {
  if (!files.length) return "Изберете поне една снимка за галерията.";
  if (files.length > profile.maxFilesPerUpload) return `Максимум ${profile.maxFilesPerUpload} файла наведнъж.`;
  for (const file of files) {
    if (!acceptedTypes.has(file.type)) return `„${file.name}“: позволени са само PNG, JPG и WEBP.`;
    if (!file.size) return `„${file.name}“ е празен файл.`;
    if (file.size > EVENT_GALLERY_SOURCE_MAX_BYTES) return `„${file.name}“ надвишава 50 MB. Изберете по-малък оригинал.`;
  }
  return null;
}

export function eventGalleryDimensions(width: number, height: number, maxEdge = profile.maxDimension) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function loadGalleryImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`„${file.name}“ не може да бъде прочетена като снимка.`)); };
    image.src = url;
  });
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (!blob || blob.type !== "image/webp") reject(new Error("Браузърът не може да компресира снимката. Опитайте с актуален Chrome, Edge или Safari."));
    else resolve(blob);
  }, "image/webp", quality));
}

async function prepareGalleryImage(file: File) {
  const image = await loadGalleryImage(file);
  if (!image.naturalWidth || !image.naturalHeight) throw new Error(`„${file.name}“ е повредена снимка.`);
  if (Math.max(image.naturalWidth, image.naturalHeight) <= profile.maxDimension && file.size <= EVENT_GALLERY_TARGET_BYTES) return file;
  const canvas = document.createElement("canvas");
  try {
    let edge = profile.maxDimension;
    while (true) {
      const dimensions = eventGalleryDimensions(image.naturalWidth, image.naturalHeight, edge);
      canvas.width = dimensions.width; canvas.height = dimensions.height;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Браузърът не може да обработи снимката.");
      context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
      for (const quality of [profile.quality / 100, 0.68, 0.58, 0.48]) {
        const blob = await encode(canvas, quality);
        if (blob.size <= EVENT_GALLERY_TARGET_BYTES) return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: blob.type, lastModified: file.lastModified });
      }
      if (edge <= 640) throw new Error(`„${file.name}“ не може да бъде намалена достатъчно. Изберете друг файл.`);
      edge = Math.max(640, Math.round(edge * 0.8));
    }
  } finally {
    canvas.width = 0; canvas.height = 0;
  }
}

export async function prepareEventGalleryImages(files: File[]) {
  const error = validateEventGallerySelection(files);
  if (error) throw new Error(error);
  const prepared: File[] = [];
  // Sequential decoding avoids holding multiple full-resolution phone photos in memory.
  for (const file of files) prepared.push(await prepareGalleryImage(file));
  return { files: prepared, originalBytes: files.reduce((sum, file) => sum + file.size, 0), preparedBytes: prepared.reduce((sum, file) => sum + file.size, 0) };
}
