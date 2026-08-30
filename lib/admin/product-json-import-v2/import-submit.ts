import type { SupabaseClient } from "@supabase/supabase-js";

import { runImportProductsFromJson } from "@/lib/admin/product-json-import-v2/import-service";
import type {
  ProductJsonImportFailureEntry,
  ProductJsonImportIssue,
  ProductJsonImportSummaryResult,
} from "@/lib/admin/product-json-import-v2/types";

export type ProductJsonImportAuthFailure = {
  ok: false;
  message: string;
  created: [];
  failed: ProductJsonImportFailureEntry[];
  warnings: ProductJsonImportIssue[];
};

export type ProductJsonImportSubmitResult =
  | ProductJsonImportSummaryResult
  | ProductJsonImportAuthFailure;

export function buildProductJsonImportRuntimeFailure(
  message: string,
  partial: Partial<ProductJsonImportSummaryResult> = {},
): ProductJsonImportSummaryResult {
  return {
    ok: false,
    importKey: partial.importKey,
    created: partial.created ?? [],
    failed: partial.failed ?? [
      {
        slug: "",
        stage: "create",
        message,
      },
    ],
    warnings: partial.warnings ?? [],
  };
}

export function buildProductJsonImportAuthFailure(
  message: string,
): ProductJsonImportAuthFailure {
  return {
    ok: false,
    message,
    created: [],
    failed: [],
    warnings: [],
  };
}

export function parseProductJsonImportFormData(formData: FormData):
  | { ok: true; json: string; imageFiles: File[] }
  | { ok: false; message: string } {
  const json = String(formData.get("json") ?? "").trim();
  if (!json) {
    return { ok: false, message: "Липсва JSON payload." };
  }

  const imageFiles = formData
    .getAll("image_files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  return { ok: true, json, imageFiles };
}

export async function submitProductJsonImport(
  supabase: SupabaseClient,
  formData: FormData,
  deps: {
    runImport?: typeof runImportProductsFromJson;
  } = {},
): Promise<ProductJsonImportSubmitResult> {
  const parsed = parseProductJsonImportFormData(formData);
  if (!parsed.ok) {
    return buildProductJsonImportAuthFailure(parsed.message);
  }

  const runImport = deps.runImport ?? runImportProductsFromJson;

  try {
    return await runImport(supabase, parsed.json, parsed.imageFiles);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Неочаквана грешка при импорт на продукти.";
    return buildProductJsonImportRuntimeFailure(
      `Импортът не успя: ${message}`,
    );
  }
}
