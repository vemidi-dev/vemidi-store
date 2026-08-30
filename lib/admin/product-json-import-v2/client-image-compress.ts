"use client";

const MAX_IMPORT_IMAGE_EDGE = 1800;
const TARGET_IMPORT_IMAGE_BYTES = 900 * 1024;
const SAFE_MULTIPART_IMAGE_BYTES = 3.5 * 1024 * 1024;
const MIN_USEFUL_SAVING_RATIO = 0.95;
const OUTPUT_MIME_TYPE = "image/webp";
const OUTPUT_QUALITIES = [0.82, 0.72, 0.62];

export type ProductImportImageCompressionResult = {
  files: File[];
  originalBytes: number;
  preparedBytes: number;
  compressedCount: number;
};

export function shouldCompressProductImportImage(file: File, force = false) {
  return (
    file.type.startsWith("image/") &&
    file.type !== "image/svg+xml" &&
    (force || file.size > TARGET_IMPORT_IMAGE_BYTES)
  );
}

export function formatProductImportBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTargetDimensions(width: number, height: number) {
  const longestEdge = Math.max(width, height);
  if (longestEdge <= MAX_IMPORT_IMAGE_EDGE) {
    return { width, height };
  }

  const ratio = MAX_IMPORT_IMAGE_EDGE / longestEdge;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Снимката „${file.name}“ не може да бъде прочетена.`));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Снимката не може да бъде оптимизирана в браузъра."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

async function compressProductImportImage(file: File, force = false): Promise<File> {
  if (!shouldCompressProductImportImage(file, force)) {
    return file;
  }

  const image = await loadImageFromFile(file);
  const dimensions = getTargetDimensions(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

  let bestBlob: Blob | null = null;
  for (const quality of OUTPUT_QUALITIES) {
    const blob = await canvasToBlob(canvas, OUTPUT_MIME_TYPE, quality);
    bestBlob = blob;
    if (blob.size <= TARGET_IMPORT_IMAGE_BYTES) {
      break;
    }
  }

  if (
    !bestBlob ||
    (bestBlob.size >= file.size * MIN_USEFUL_SAVING_RATIO &&
      file.size <= TARGET_IMPORT_IMAGE_BYTES)
  ) {
    return file;
  }

  return new File([bestBlob], file.name, {
    type: bestBlob.type || OUTPUT_MIME_TYPE,
    lastModified: file.lastModified,
  });
}

export async function prepareProductImportImages(
  files: File[],
): Promise<ProductImportImageCompressionResult> {
  const preparedFiles: File[] = [];
  const totalOriginalBytes = files.reduce((sum, file) => sum + file.size, 0);
  let preparedBytes = 0;
  let compressedCount = 0;
  const shouldShrinkBundle = totalOriginalBytes > SAFE_MULTIPART_IMAGE_BYTES;

  for (const file of files) {
    const prepared = await compressProductImportImage(file, shouldShrinkBundle);
    preparedFiles.push(prepared);
    preparedBytes += prepared.size;
    if (prepared.size < file.size && prepared !== file) {
      compressedCount += 1;
    }
  }

  return {
    files: preparedFiles,
    originalBytes: totalOriginalBytes,
    preparedBytes,
    compressedCount,
  };
}
