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
  options: { allowUploadOrderFallback?: boolean } = {},
): {
  sortedImages: ImageImportV2[];
  matchedOriginalFilenames: string[];
  errors: ProductJsonImportIssue[];
  warnings: ProductJsonImportIssue[];
} {
  const errors: ProductJsonImportIssue[] = [];
  const warnings: ProductJsonImportIssue[] = [];
  const { index, duplicateBasenames } = buildUploadFilenameIndex(uploadedFilenames);
  const sortedImages = sortProductImages(images);

  if (duplicateBasenames.length > 0) {
    warnings.push({
      code: "DUPLICATE_UPLOAD_BASENAME",
      severity: "warning",
      slug,
      message: `Качени са няколко файла с едно и също име: ${duplicateBasenames.join(", ")}. Ако original_filename не съвпада, ще се използва редът на качване.`,
    });
  }

  const matchedOriginalFilenames: string[] = [];
  const missingImages: ImageImportV2[] = [];

  for (const image of sortedImages) {
    const key = normalizeImageBasename(image.original_filename);
    const matches = index.get(key) ?? [];
    if (matches.length === 0) {
      missingImages.push(image);
      continue;
    }

    matchedOriginalFilenames.push(matches[0]!);
  }

  if (
    missingImages.length > 0 &&
    uploadedFilenames.length > 0 &&
    options.allowUploadOrderFallback !== false
  ) {
    const uploadOrderImages = uploadedFilenames.map((filename, index) => {
      const source = sortedImages[index];
      return {
        ...(source ?? {
          alt: `${slug} - допълнителна снимка ${index + 1}`,
        }),
        original_filename: filename,
        ...(index === 0 ? { primary: true } : { primary: undefined }),
      };
    });

    warnings.push({
      code: "IMAGE_MATCHED_BY_UPLOAD_ORDER",
      severity: "warning",
      slug,
      message:
        "Имената на снимките не съвпадат напълно с JSON. Снимките ще се използват по реда на качване.",
    });

    if (uploadedFilenames.length > sortedImages.length) {
      warnings.push({
        code: "EXTRA_UPLOADS_USED",
        severity: "warning",
        slug,
        message: `Качени са ${uploadedFilenames.length - sortedImages.length} допълнителни снимки. Те ще се добавят в края на галерията с автоматичен alt текст.`,
      });
    }

    if (uploadedFilenames.length < sortedImages.length) {
      warnings.push({
        code: "FEWER_UPLOADS_USED",
        severity: "warning",
        slug,
        message: `Качени са ${uploadedFilenames.length} от ${sortedImages.length} описани снимки. Черновата ще се създаде с наличните снимки; останалите могат да се добавят по-късно.`,
      });
    }

    return {
      sortedImages: uploadOrderImages,
      matchedOriginalFilenames: uploadedFilenames,
      errors,
      warnings,
    };
  }

  for (const image of missingImages) {
    errors.push({
      code: "IMAGE_FILE_MISSING",
      severity: "error",
      slug,
      message: `Липсва качен файл за „${image.original_filename}".`,
    });
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
