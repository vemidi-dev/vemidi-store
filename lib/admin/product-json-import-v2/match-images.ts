import type {
  ImageImportV2,
  ProductJsonImportIssue,
} from "@/lib/admin/product-json-import-v2/types";

export function normalizeImageBasename(name: string): string {
  const trimmed = name.trim();
  const segments = trimmed.split(/[/\\]/);
  const basename = segments[segments.length - 1] ?? trimmed;
  return basename.trim().toLowerCase();
}

export function sortProductImages(images: ImageImportV2[]): ImageImportV2[] {
  return images
    .map((image, index) => ({ image, index }))
    .sort((left, right) => {
      const leftPrimary = left.image.primary === true ? 0 : 1;
      const rightPrimary = right.image.primary === true ? 0 : 1;
      if (leftPrimary !== rightPrimary) {
        return leftPrimary - rightPrimary;
      }
      return left.index - right.index;
    })
    .map(({ image }) => image);
}

export function buildUploadFilenameIndex(uploadedFilenames: string[]): {
  index: Map<string, string[]>;
  duplicateBasenames: string[];
} {
  const index = new Map<string, string[]>();
  const duplicateBasenames: string[] = [];

  for (const filename of uploadedFilenames) {
    const key = normalizeImageBasename(filename);
    const existing = index.get(key) ?? [];
    existing.push(filename);
    index.set(key, existing);
    if (existing.length === 2) {
      duplicateBasenames.push(key);
    }
  }

  return { index, duplicateBasenames };
}

export function detectUnusedUploads(
  uploadedFilenames: string[],
  referencedBasenames: ReadonlySet<string>,
): string[] {
  return uploadedFilenames.filter(
    (filename) => !referencedBasenames.has(normalizeImageBasename(filename)),
  );
}

export function matchProductImagesToUploads(
  slug: string,
  images: ImageImportV2[],
  uploadedFilenames: string[],
): {
  sortedImages: ImageImportV2[];
  matchedOriginalFilenames: string[];
  errors: ProductJsonImportIssue[];
  warnings: ProductJsonImportIssue[];
} {
  const errors: ProductJsonImportIssue[] = [];
  const warnings: ProductJsonImportIssue[] = [];
  const { index, duplicateBasenames } = buildUploadFilenameIndex(uploadedFilenames);

  if (duplicateBasenames.length > 0) {
    errors.push({
      code: "DUPLICATE_UPLOAD_BASENAME",
      severity: "error",
      slug,
      message: `Качени са няколко файла с едно и също име: ${duplicateBasenames.join(", ")}.`,
    });
  }

  const sortedImages = sortProductImages(images);
  const matchedOriginalFilenames: string[] = [];

  for (const image of sortedImages) {
    const key = normalizeImageBasename(image.original_filename);
    const matches = index.get(key) ?? [];
    if (matches.length === 0) {
      errors.push({
        code: "IMAGE_FILE_MISSING",
        severity: "error",
        slug,
        message: `Липсва качен файл за „${image.original_filename}".`,
      });
      continue;
    }

    matchedOriginalFilenames.push(matches[0]!);
  }

  return {
    sortedImages,
    matchedOriginalFilenames,
    errors,
    warnings,
  };
}

export function collectReferencedImageBasenames(
  products: ReadonlyArray<{ images: ImageImportV2[] }>,
): Set<string> {
  const referenced = new Set<string>();
  for (const product of products) {
    for (const image of product.images) {
      referenced.add(normalizeImageBasename(image.original_filename));
    }
  }
  return referenced;
}

export function buildUploadFileIndex(files: File[]): Map<string, File> {
  const index = new Map<string, File>();
  for (const file of files) {
    const key = normalizeImageBasename(file.name);
    if (!index.has(key)) {
      index.set(key, file);
    }
  }
  return index;
}

export function resolveProductImportImageFiles(
  slug: string,
  images: ImageImportV2[],
  uploadIndex: Map<string, File>,
): {
  files: File[];
  altTexts: string[];
  errors: ProductJsonImportIssue[];
} {
  const sortedImages = sortProductImages(images);
  const files: File[] = [];
  const altTexts: string[] = [];
  const errors: ProductJsonImportIssue[] = [];

  for (const image of sortedImages) {
    const key = normalizeImageBasename(image.original_filename);
    const file = uploadIndex.get(key);
    if (!file) {
      errors.push({
        code: "IMAGE_FILE_MISSING",
        severity: "error",
        slug,
        message: `Липсва качен файл за „${image.original_filename}".`,
      });
      continue;
    }

    files.push(file);
    altTexts.push(image.alt.trim().slice(0, 160));
  }

  return { files, altTexts, errors };
}
