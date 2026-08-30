"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import {
  importProductsFromJson,
  validateProductJsonImport,
} from "@/app/admin/product-import-actions";
import { ProductJsonImportPreviewTable } from "@/components/admin/product-json-import-preview-table";
import { ProductJsonImportSummary } from "@/components/admin/product-json-import-summary";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import { makeAdminProductsHref } from "@/lib/admin/products-query";
import type {
  ProductJsonImportSummaryResult,
  ProductJsonImportValidationResult,
} from "@/lib/admin/product-json-import-v2/types";

const backHref = makeAdminProductsHref({ productsView: undefined });

function isValidationResult(
  value: ProductJsonImportValidationResult | { ok: false; message: string },
): value is ProductJsonImportValidationResult {
  return "previews" in value;
}

function isSummaryResult(
  value: ProductJsonImportSummaryResult | { ok: false; message: string },
): value is ProductJsonImportSummaryResult {
  return "created" in value;
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

  const uploadedFilenames = useMemo(
    () => imageFiles.map((file) => file.name),
    [imageFiles],
  );

  const resetResults = useCallback(() => {
    setValidation(null);
    setSummary(null);
    setErrorMessage(null);
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

    try {
      const formData = new FormData();
      formData.set("json", jsonText);
      for (const file of imageFiles) {
        formData.append("image_files", file);
      }

      const result = await importProductsFromJson(formData);
      if (!isSummaryResult(result)) {
        setErrorMessage(result.message);
        return;
      }

      setSummary(result);
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
              ? `Избрани ${imageFiles.length} файла. Match по original_filename.`
              : "Изберете всички снимки от bundle-а преди проверка."}
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
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
            {pendingImport ? "Импортира се…" : "Импорт като чернови"}
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
