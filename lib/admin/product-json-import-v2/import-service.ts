import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createProductDraftWithGallery,
  type CreateProductDraftWithGalleryResult,
} from "@/lib/admin/product-create-pipeline";
import type { ProductMutationInput } from "@/lib/admin/product-rpc";
import {
  buildUploadFileIndex,
  resolveProductImportImageFiles,
} from "@/lib/admin/product-json-import-v2/match-images";
import { parseProductJsonImportFile } from "@/lib/admin/product-json-import-v2/parse";
import { validateProductJsonImportSync } from "@/lib/admin/product-json-import-v2/validate-sync";
import { validateProductJsonImportWithDb } from "@/lib/admin/product-json-import-v2/validate-async";
import type {
  ImportableProduct,
  ProductJsonImportFailureEntry,
  ProductJsonImportIssue,
  ProductJsonImportSummaryResult,
  ProductJsonImportValidationResult,
  ValidateProductJsonImportInput,
} from "@/lib/admin/product-json-import-v2/types";
import { productEditAnchorId } from "@/lib/admin/product-edit-navigation";

const ADMIN_PRODUCTS_PATH = "/admin?tab=products";

function mapDraftFailureStage(
  stage: "create" | "status" | "upload" | "gallery",
): ProductJsonImportFailureEntry["stage"] {
  if (stage === "create" || stage === "status") {
    return "create";
  }
  return "gallery";
}

function buildProductEditUrl(productId: string) {
  return `${ADMIN_PRODUCTS_PATH}&editProduct=${productId}#${productEditAnchorId(productId)}`;
}

function validationFailureResult(
  message: string,
  code: string,
): ProductJsonImportValidationResult {
  return {
    ok: false,
    fileErrors: [{ code, message, severity: "error" }],
    fileWarnings: [],
    previews: [],
    normalizedProducts: [],
    importableProducts: [],
  };
}

export async function runValidateProductJsonImport(
  supabase: SupabaseClient,
  input: ValidateProductJsonImportInput,
): Promise<ProductJsonImportValidationResult> {
  const parsed = parseProductJsonImportFile(input.json);
  if (!parsed.ok) {
    return validationFailureResult(parsed.message, parsed.code);
  }

  const syncResult = validateProductJsonImportSync(
    parsed.file,
    input.uploadedFilenames ?? [],
  );

  return validateProductJsonImportWithDb(supabase, syncResult);
}

function toMutationInput(importable: ImportableProduct): ProductMutationInput {
  return {
    ...importable.payload.mutationInput,
    categoryIds: importable.categoryIds,
    primaryCategoryId: importable.primaryCategoryId,
    colorFields: [],
    optionGroups: [],
    wishTemplateIds: [],
  };
}

export async function runImportProductsFromJson(
  supabase: SupabaseClient,
  json: string,
  imageFiles: File[],
  deps: {
    createDraft?: (
      client: SupabaseClient,
      input: Parameters<typeof createProductDraftWithGallery>[1],
    ) => Promise<CreateProductDraftWithGalleryResult>;
  } = {},
): Promise<ProductJsonImportSummaryResult> {
  const createDraft = deps.createDraft ?? createProductDraftWithGallery;
  const validation = await runValidateProductJsonImport(supabase, {
    json,
    uploadedFilenames: imageFiles.map((file) => file.name),
  });

  const warnings: ProductJsonImportIssue[] = [
    ...validation.fileWarnings,
    ...validation.previews.flatMap((preview) => preview.warnings),
  ];

  const failed: ProductJsonImportFailureEntry[] = validation.previews
    .filter((preview) => preview.errors.length > 0)
    .map((preview) => ({
      slug: preview.slug,
      stage: "validate" as const,
      message: preview.errors.map((error) => error.message).join(" "),
    }));

  if (validation.importableProducts.length === 0) {
    return {
      ok: false,
      importKey: validation.importKey,
      created: [],
      failed,
      warnings,
    };
  }

  const uploadIndex = buildUploadFileIndex(imageFiles);
  const created: ProductJsonImportSummaryResult["created"] = [];

  for (const importable of validation.importableProducts) {
    const { files, altTexts, errors } = resolveProductImportImageFiles(
      importable.normalized.slug,
      importable.normalized.images,
      uploadIndex,
    );

    if (errors.length > 0) {
      failed.push({
        slug: importable.normalized.slug,
        stage: "validate",
        message: errors.map((error) => error.message).join(" "),
      });
      continue;
    }

    const result = await createDraft(supabase, {
      mutationInput: toMutationInput(importable),
      postCreate: importable.payload.postCreate,
      imageFiles: files,
      imageAltTexts: altTexts,
    });

    if (!result.ok) {
      failed.push({
        slug: importable.normalized.slug,
        stage: mapDraftFailureStage(result.stage),
        message: result.message,
        productId: result.productId,
      });
      continue;
    }

    created.push({
      slug: importable.normalized.slug,
      productId: result.productId,
      editUrl: buildProductEditUrl(result.productId),
      imageCount: result.imageCount,
    });
  }

  return {
    ok: created.length > 0,
    importKey: validation.importKey,
    created,
    failed,
    warnings,
  };
}
