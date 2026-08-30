import {
  MAX_PERSONALIZATION_FIELDS,
  MAX_PRODUCT_NAME_LENGTH,
} from "@/lib/admin/product-json-import-v2/constants";
import {
  collectReferencedImageBasenames,
  detectUnusedUploads,
  matchProductImagesToUploads,
  normalizeImageBasename,
  sortProductImages,
} from "@/lib/admin/product-json-import-v2/match-images";
import {
  mapNormalizedProductImportToMutation,
  normalizeProductImportV2,
} from "@/lib/admin/product-json-import-v2/map-to-mutation";
import type {
  ImageImportV2,
  NormalizedProductImportV2,
  ProductImportFileV2,
  ProductImportPreview,
  ProductImportPreviewStatus,
  ProductJsonImportIssue,
  ProductJsonImportSyncValidationResult,
} from "@/lib/admin/product-json-import-v2/types";
import { validateProductSlug } from "@/lib/product-slug";
import { validateQuantityPriceTierRanges } from "@/lib/product-quantity-pricing";

function issue(
  code: string,
  message: string,
  severity: ProductJsonImportIssue["severity"],
  slug?: string,
): ProductJsonImportIssue {
  return { code, message, severity, slug };
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validatePersonalizationFields(
  slug: string,
  product: NormalizedProductImportV2,
): ProductJsonImportIssue[] {
  const errors: ProductJsonImportIssue[] = [];

  if (product.personalizationFields.length > MAX_PERSONALIZATION_FIELDS) {
    errors.push(
      issue(
        "TOO_MANY_PERSONALIZATION_FIELDS",
        `Продуктът има повече от ${MAX_PERSONALIZATION_FIELDS} полета за персонализация.`,
        "error",
        slug,
      ),
    );
    return errors;
  }

  const usedKeys = new Set<string>();
  for (const [index, field] of product.personalizationFields.entries()) {
    if (
      !field.label ||
      !/^[a-z][a-z0-9_]{0,63}$/.test(field.key) ||
      !["text", "textarea", "date"].includes(field.type) ||
      !Number.isInteger(field.maxLength) ||
      field.maxLength < 1 ||
      field.maxLength > 1000 ||
      !Number.isFinite(field.priceDelta) ||
      field.priceDelta < 0 ||
      usedKeys.has(field.key)
    ) {
      errors.push(
        issue(
          "INVALID_PERSONALIZATION_FIELD",
          `Проверете настройките на поле за персонализация #${index + 1}.`,
          "error",
          slug,
        ),
      );
    }
    usedKeys.add(field.key);
  }

  return errors;
}

function validateImages(slug: string, images: ImageImportV2[]): ProductJsonImportIssue[] {
  const errors: ProductJsonImportIssue[] = [];

  if (images.length === 0) {
    errors.push(
      issue("IMAGE_REQUIRED", "Продуктът трябва да има поне една снимка.", "error", slug),
    );
    return errors;
  }

  const seenFilenames = new Set<string>();
  let primaryCount = 0;

  for (const image of images) {
    const basename = normalizeImageBasename(image.original_filename);
    if (!basename) {
      errors.push(
        issue(
          "INVALID_IMAGE_FILENAME",
          "original_filename е задължителен за всяка снимка.",
          "error",
          slug,
        ),
      );
    } else if (seenFilenames.has(basename)) {
      errors.push(
        issue(
          "DUPLICATE_IMAGE_FILENAME",
          `Дублиран original_filename „${image.original_filename}" в продукта.`,
          "error",
          slug,
        ),
      );
    } else {
      seenFilenames.add(basename);
    }

    if (!image.alt.trim()) {
      errors.push(
        issue(
          "IMAGE_ALT_REQUIRED",
          `alt текстът е задължителен за „${image.original_filename}".`,
          "error",
          slug,
        ),
      );
    }

    if (image.primary === true) {
      primaryCount += 1;
    }
  }

  if (primaryCount > 1) {
    errors.push(
      issue(
        "MULTIPLE_PRIMARY_IMAGES",
        "Само една снимка може да има primary: true.",
        "error",
        slug,
      ),
    );
  }

  return errors;
}

function validateStockedProduct(
  slug: string,
  product: NormalizedProductImportV2,
): ProductJsonImportIssue[] {
  if (product.fulfillmentType !== "stocked") {
    return [];
  }

  if (
    product.stockQuantity === null ||
    !Number.isInteger(product.stockQuantity) ||
    product.stockQuantity < 0
  ) {
    return [
      issue(
        "INVALID_STOCK_QUANTITY",
        "stock_quantity е задължително и трябва да е цяло число ≥ 0 при stocked продукт.",
        "error",
        slug,
      ),
    ];
  }

  return [];
}

function validateNormalizedProduct(
  product: NormalizedProductImportV2,
): ProductJsonImportIssue[] {
  const errors: ProductJsonImportIssue[] = [];
  const slug = product.slug;

  const slugValidation = validateProductSlug(product.slug);
  if (!slugValidation.ok) {
    errors.push(
      issue("INVALID_SLUG", `Невалиден slug „${product.slug}".`, "error", slug),
    );
  }

  if (!product.name.trim()) {
    errors.push(
      issue("MISSING_NAME", "name е задължително.", "error", slug),
    );
  } else if (product.name.length > MAX_PRODUCT_NAME_LENGTH) {
    errors.push(
      issue(
        "NAME_TOO_LONG",
        `name не може да надвишава ${MAX_PRODUCT_NAME_LENGTH} символа.`,
        "error",
        slug,
      ),
    );
  }

  if (!product.description.trim()) {
    errors.push(
      issue("EMPTY_DESCRIPTION", "description е задължително.", "error", slug),
    );
  }

  if (!Number.isFinite(product.price) || product.price < 0) {
    errors.push(
      issue("INVALID_PRICE", "price трябва да е число ≥ 0 с до 2 знака.", "error", slug),
    );
  }

  if (product.categorySlugs.length === 0) {
    errors.push(
      issue(
        "CATEGORY_REQUIRED",
        "categories трябва да съдържа поне един slug.",
        "error",
        slug,
      ),
    );
  }

  if (!product.primaryCategorySlug) {
    errors.push(
      issue(
        "PRIMARY_CATEGORY_REQUIRED",
        "primary_category е задължително.",
        "error",
        slug,
      ),
    );
  } else if (!product.categorySlugs.includes(product.primaryCategorySlug)) {
    errors.push(
      issue(
        "PRIMARY_CATEGORY_NOT_IN_CATEGORIES",
        "primary_category трябва да е елемент от categories.",
        "error",
        slug,
      ),
    );
  }

  errors.push(...validateImages(slug, product.images));
  errors.push(...validatePersonalizationFields(slug, product));
  errors.push(...validateStockedProduct(slug, product));

  return errors;
}

function validateRawRequiredFields(
  raw: ProductImportFileV2["products"][number],
  slugHint: string,
): ProductJsonImportIssue[] {
  const errors: ProductJsonImportIssue[] = [];
  const slug = asTrimmedString(raw.slug).toLowerCase() || slugHint;

  if (!asTrimmedString(raw.name)) {
    errors.push(issue("MISSING_NAME", "name е задължително.", "error", slug));
  }
  if (!asTrimmedString(raw.slug)) {
    errors.push(issue("MISSING_SLUG", "slug е задължителен.", "error", slug));
  }
  if (typeof raw.price !== "number") {
    errors.push(issue("INVALID_PRICE", "price е задължително.", "error", slug));
  }
  if (!asTrimmedString(raw.description)) {
    errors.push(issue("EMPTY_DESCRIPTION", "description е задължително.", "error", slug));
  }
  if (!Array.isArray(raw.categories) || raw.categories.length === 0) {
    errors.push(
      issue("CATEGORY_REQUIRED", "categories е задължително.", "error", slug),
    );
  }
  if (!asTrimmedString(raw.primary_category)) {
    errors.push(
      issue("PRIMARY_CATEGORY_REQUIRED", "primary_category е задължително.", "error", slug),
    );
  }
  if (!Array.isArray(raw.images) || raw.images.length === 0) {
    errors.push(
      issue("IMAGE_REQUIRED", "images трябва да съдържа поне една снимка.", "error", slug),
    );
  }

  return errors;
}

function resolvePreviewStatus(
  errors: ProductJsonImportIssue[],
  warnings: ProductJsonImportIssue[],
): ProductImportPreviewStatus {
  if (errors.length > 0) {
    return "error";
  }
  if (warnings.length > 0) {
    return "warning";
  }
  return "ready";
}

export function validateProductJsonImportSync(
  file: ProductImportFileV2,
  uploadedFilenames: string[] = [],
): ProductJsonImportSyncValidationResult {
  const fileErrors: ProductJsonImportIssue[] = [];
  const fileWarnings: ProductJsonImportIssue[] = [];
  const previews: ProductImportPreview[] = [];
  const normalizedProducts: NormalizedProductImportV2[] = [];

  const slugCounts = new Map<string, number>();
  for (const raw of file.products) {
    const slug = asTrimmedString(raw.slug).toLowerCase();
    if (!slug) {
      continue;
    }
    slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
  }

  const duplicateSlugs = [...slugCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([slug]) => slug);

  for (const slug of duplicateSlugs) {
    fileErrors.push(
      issue(
        "DUPLICATE_SLUG_IN_FILE",
        `slug „${slug}" се повтаря в JSON файла.`,
        "error",
        slug,
      ),
    );
  }

  const normalizedForReference: NormalizedProductImportV2[] = [];

  for (const [index, raw] of file.products.entries()) {
    const slugHint = `product-${index + 1}`;
    const rawErrors = validateRawRequiredFields(raw, slugHint);
    const { product, warnings: normalizeWarnings } = normalizeProductImportV2(
      raw,
      file.defaults,
      slugHint,
    );

    const errors = [...rawErrors];
    const warnings = [...normalizeWarnings];

    if (duplicateSlugs.includes(product?.slug ?? asTrimmedString(raw.slug).toLowerCase())) {
      if (product) {
        errors.push(
          issue(
            "DUPLICATE_SLUG_IN_FILE",
            `slug „${product.slug}" се повтаря в JSON файла.`,
            "error",
            product.slug,
          ),
        );
      }
    }

    if (product) {
      errors.push(...validateNormalizedProduct(product));

      if (raw.quantity_price_tiers !== undefined && raw.quantity_price_tiers !== null) {
        const tierValidation = validateQuantityPriceTierRanges(raw.quantity_price_tiers);
        if (!tierValidation.ok) {
          errors.push(
            issue(
              "QUANTITY_TIERS_INVALID",
              tierValidation.message,
              "error",
              product.slug,
            ),
          );
        }
      }

      if (uploadedFilenames.length > 0) {
        const imageMatch = matchProductImagesToUploads(
          product.slug,
          product.images,
          uploadedFilenames,
          { allowUploadOrderFallback: file.products.length === 1 },
        );
        errors.push(...imageMatch.errors);
        warnings.push(...imageMatch.warnings);
        product.images = imageMatch.sortedImages;
      } else {
        product.images = sortProductImages(product.images);
      }

      if (errors.length === 0) {
        normalizedProducts.push(product);
        normalizedForReference.push(product);
      }
    }

    const previewSlug =
      product?.slug ?? (asTrimmedString(raw.slug).toLowerCase() || slugHint);
    previews.push({
      slug: previewSlug,
      name: product?.name ?? (asTrimmedString(raw.name) || previewSlug),
      price: product?.price ?? (typeof raw.price === "number" ? raw.price : 0),
      categorySlugs: product?.categorySlugs ?? [],
      primaryCategorySlug: product?.primaryCategorySlug ?? "",
      imageCount: product?.images.length ?? (Array.isArray(raw.images) ? raw.images.length : 0),
      status: resolvePreviewStatus(errors, warnings),
      errors,
      warnings,
    });
  }

  if (uploadedFilenames.length > 0 && normalizedForReference.length > 0) {
    const referenced = collectReferencedImageBasenames(normalizedForReference);
    const unused = detectUnusedUploads(uploadedFilenames, referenced);
    for (const filename of unused) {
      fileWarnings.push(
        issue(
          "UNUSED_UPLOAD",
          `Каченият файл „${filename}" не е рефериран в JSON.`,
          "warning",
        ),
      );
    }
  }

  const ok =
    fileErrors.length === 0 &&
    previews.every((preview) => preview.errors.length === 0);

  return {
    ok,
    importKey: file.import_key,
    fileErrors,
    fileWarnings,
    previews,
    normalizedProducts,
  };
}

export function mapValidatedProductImports(
  products: NormalizedProductImportV2[],
) {
  return products.map((product) => mapNormalizedProductImportToMutation(product));
}
