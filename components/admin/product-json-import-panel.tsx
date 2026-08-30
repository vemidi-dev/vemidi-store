"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { validateProductJsonImport } from "@/app/admin/product-import-actions";
import { ProductJsonImportPreviewTable } from "@/components/admin/product-json-import-preview-table";
import { ProductJsonImportSummary } from "@/components/admin/product-json-import-summary";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import { makeAdminProductsHref } from "@/lib/admin/products-query";
import {
  formatProductImportBytes,
  prepareProductImportImages,
} from "@/lib/admin/product-json-import-v2/client-image-compress";
import type { ProductJsonImportSubmitResult } from "@/lib/admin/product-json-import-v2/import-submit";
import type {
  ProductJsonImportSummaryResult,
  ProductJsonImportValidationResult,
} from "@/lib/admin/product-json-import-v2/types";

const backHref = makeAdminProductsHref({ productsView: undefined });
const IMPORT_SUBMIT_PATH = "/admin/product-import";

const IMPORT_UNEXPECTED_RESPONSE_MESSAGE =
  "Импортът не успя — сървърът върна неочакван отговор. Опитайте отново или намалете размера на снимките.";

const IMPORT_TIMEOUT_MESSAGE =
  "Импортът надхвърли времевия лимит на сървъра. Опитайте с по-малки снимки или по-малко файлове наведнъж.";

const IMPORT_PAYLOAD_TOO_LARGE_MESSAGE =
  "Импортът не беше изпратен, защото снимките са прекалено големи за една заявка. Снимките се оптимизират автоматично преди import; ако пак виждате тази грешка, качете по-малко снимки наведнъж.";

function isValidationResult(
  value: ProductJsonImportValidationResult | { ok: false; message: string },
): value is ProductJsonImportValidationResult {
  return "previews" in value;
}

function isAuthFailure(
  value: ProductJsonImportSubmitResult,
): value is Extract<ProductJsonImportSubmitResult, { message: string }> {
  return (
    !value.ok &&
    "message" in value &&
    value.created.length === 0 &&
    value.failed.length === 0
  );
}

function isSummaryResult(value: ProductJsonImportSubmitResult): value is ProductJsonImportSummaryResult {
  return !isAuthFailure(value) && "created" in value && Array.isArray(value.created);
}

function getSubmitErrorMessage(value: ProductJsonImportSubmitResult): string | null {
  if (isAuthFailure(value)) {
    return value.message;
  }

  if (!value.ok) {
    if (value.failed.length > 0) {
      return value.failed.map((entry) => entry.message).join(" ");
    }

    return "Импортът не създаде продукти.";
  }

  return null;
}

async function submitProductJsonImportRequest(
  formData: FormData,
): Promise<ProductJsonImportSubmitResult> {
  const response = await fetch(IMPORT_SUBMIT_PATH, {
    method: "POST",
    body: formData,
  });

  if (response.status === 413) {
    throw new Error(IMPORT_PAYLOAD_TOO_LARGE_MESSAGE);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (response.status === 504) {
      throw new Error(IMPORT_TIMEOUT_MESSAGE);
    }
    throw new Error(IMPORT_UNEXPECTED_RESPONSE_MESSAGE);
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("ok" in payload) ||
    typeof (payload as { ok: unknown }).ok !== "boolean"
  ) {
    throw new Error(IMPORT_UNEXPECTED_RESPONSE_MESSAGE);
  }

  return payload as ProductJsonImportSubmitResult;
}

export function ProductJsonImportPanel() {
  const [jsonText, setJsonText] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [validation, setValidation] = useState<ProductJsonImportValidationResult | null>(
    null,
  );
  const [summary, setSummary] = useState<ProductJsonImportSummaryResult | null>(null);
  const [pendingValidate, setPendingValidate] = useState(false);
  const [pendingImport, setPendingImport] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imagePreparationMessage, setImagePreparationMessage] = useState<string | null>(
    null,
  );

  const uploadedFilenames = useMemo(
    () => imageFiles.map((file) => file.name),
    [imageFiles],
  );

  const resetResults = useCallback(() => {
    setValidation(null);
    setSummary(null);
    setErrorMessage(null);
    setImagePreparationMessage(null);
  }, []);

  const handleJsonFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const text = await file.text();
      setJsonText(text);
      resetResults();
    },
    [resetResults],
  );

  const handleJsonTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setJsonText(event.target.value);
      resetResults();
    },
    [resetResults],
  );

  const handleImagesChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = [...(event.target.files ?? [])];
      setImageFiles(files);
      resetResults();
    },
    [resetResults],
  );

  const handleValidate = useCallback(async () => {
    if (!jsonText.trim()) {
      setErrorMessage("Добавете JSON файл или paste-нете валиден JSON.");
      return;
    }

    setPendingValidate(true);
    setErrorMessage(null);
    setSummary(null);

    try {
      const result = await validateProductJsonImport({
        json: jsonText,
        uploadedFilenames,
      });

      if (!isValidationResult(result)) {
        setValidation(null);
        setErrorMessage(result.message);
        return;
      }

      setValidation(result);
    } catch (error) {
      setValidation(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Неуспешна проверка на JSON импорта.",
      );
    } finally {
      setPendingValidate(false);
    }
  }, [jsonText, uploadedFilenames]);

  const handleImport = useCallback(async () => {
    if (!validation?.ok) {
      setErrorMessage("Поправете blocking грешките преди импорт.");
      return;
    }

    setPendingImport(true);
    setErrorMessage(null);
    setImagePreparationMessage(null);

    try {
      const preparedImages = await prepareProductImportImages(imageFiles);
      if (preparedImages.compressedCount > 0) {
        setImagePreparationMessage(
          `Подготвени ${preparedImages.compressedCount} снимки: ${formatProductImportBytes(
            preparedImages.originalBytes,
          )} → ${formatProductImportBytes(preparedImages.preparedBytes)}.`,
        );
      }

      const formData = new FormData();
      formData.set("json", jsonText);
      for (const file of preparedImages.files) {
        formData.append("image_files", file);
      }

      const result = await submitProductJsonImportRequest(formData);
      const submitError = getSubmitErrorMessage(result);

      if (isAuthFailure(result)) {
        setErrorMessage(submitError ?? IMPORT_UNEXPECTED_RESPONSE_MESSAGE);
        return;
      }

      if (!isSummaryResult(result)) {
        setErrorMessage(IMPORT_UNEXPECTED_RESPONSE_MESSAGE);
        return;
      }

      setSummary(result);
      if (submitError) {
        setErrorMessage(submitError);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Неуспешен импорт на продукти.",
      );
    } finally {
      setPendingImport(false);
    }
  }, [validation, jsonText, imageFiles]);

  const canImport = Boolean(validation?.ok && !pendingValidate && !pendingImport);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-boutique-ink">Импорт от JSON v2</h1>
          <p className="mt-1 text-sm text-boutique-muted">
            Batch import на продукти като чернови от JSON + image bundle.
          </p>
        </div>
        <Link
          href={backHref}
          className="rounded-lg border border-boutique-line px-3 py-1.5 text-xs font-semibold text-boutique-ink transition hover:border-boutique-sage-deep/40"
        >
          Обратно към продуктите
        </Link>
      </div>

      <section className={`${adminPanelClass} space-y-5`}>
        <div>
          <label htmlFor="product-import-json-file" className="text-sm font-medium text-boutique-ink">
            1. JSON файл
          </label>
          <input
            id="product-import-json-file"
            type="file"
            accept=".json,application/json"
            onChange={handleJsonFileChange}
            className={`${adminFieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-boutique-bg file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-boutique-ink`}
          />
          <p className={adminHelperClass}>
            Или paste-нете JSON по-долу. Приема се само `version: 2`.
          </p>
        </div>

        <div>
          <label htmlFor="product-import-json-text" className="text-sm font-medium text-boutique-ink">
            JSON съдържание
          </label>
          <textarea
            id="product-import-json-text"
            value={jsonText}
            onChange={handleJsonTextChange}
            rows={8}
            spellCheck={false}
            className={`${adminFieldClass} font-mono text-xs`}
            placeholder='{"version":2,"products":[...]}'
          />
        </div>

        <div>
          <label htmlFor="product-import-images" className="text-sm font-medium text-boutique-ink">
            2. Снимки (multi-file)
          </label>
          <input
            id="product-import-images"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={handleImagesChange}
            className={`${adminFieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-boutique-bg file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-boutique-ink`}
          />
          <p className={adminHelperClass}>
            {imageFiles.length > 0
              ? `Избрани ${imageFiles.length} файла. Първо се търси match по original_filename; при един продукт може и по реда на качване.`
              : "Може да качите колкото снимки имате. Ако липсват снимки, черновата ще се създаде без тях и ще ги добавите по-късно."}
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {imagePreparationMessage ? (
          <div className="rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 text-sm text-boutique-muted">
            {imagePreparationMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleValidate}
            disabled={pendingValidate || pendingImport || !jsonText.trim()}
            className="rounded-lg bg-boutique-ink px-4 py-2 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingValidate ? "Проверява се…" : "Провери"}
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!canImport}
            className="rounded-lg border border-boutique-line px-4 py-2 text-sm font-semibold text-boutique-ink transition hover:border-boutique-sage-deep/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingImport ? "Подготвя се…" : "Импорт като чернови"}
          </button>
        </div>
      </section>

      {validation ? (
        <section className={`${adminPanelClass} space-y-4`}>
          <div>
            <h2 className="font-heading text-xl text-boutique-ink">Preview</h2>
            <p className="mt-1 text-sm text-boutique-muted">
              {validation.importableProducts.length} готови за import ·{" "}
              {validation.previews.filter((preview) => preview.status === "error").length} с
              грешки
            </p>
          </div>

          {validation.fileErrors.length > 0 ? (
            <ul className="space-y-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {validation.fileErrors.map((issue) => (
                <li key={issue.code}>{issue.message}</li>
              ))}
            </ul>
          ) : null}

          {validation.fileWarnings.length > 0 ? (
            <ul className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {validation.fileWarnings.map((issue) => (
                <li key={issue.code}>{issue.message}</li>
              ))}
            </ul>
          ) : null}

          <ProductJsonImportPreviewTable previews={validation.previews} />
        </section>
      ) : null}

      {summary ? <ProductJsonImportSummary summary={summary} /> : null}
    </div>
  );
}
