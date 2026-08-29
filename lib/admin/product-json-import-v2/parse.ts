import {
  MAX_PRODUCT_JSON_IMPORT_BYTES,
  MAX_PRODUCTS_PER_IMPORT,
  PRODUCT_JSON_IMPORT_VERSION,
} from "@/lib/admin/product-json-import-v2/constants";
import type {
  ProductImportFileV2,
  ProductImportV2Raw,
  ProductJsonImportParseResult,
} from "@/lib/admin/product-json-import-v2/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseProducts(value: unknown): ProductImportV2Raw[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter(isRecord) as ProductImportV2Raw[];
}

export function parseProductJsonImportFile(raw: string): ProductJsonImportParseResult {
  const byteLength = Buffer.byteLength(raw, "utf8");
  if (byteLength > MAX_PRODUCT_JSON_IMPORT_BYTES) {
    return {
      ok: false,
      code: "JSON_TOO_LARGE",
      message: `JSON файлът надвишава лимита от ${MAX_PRODUCT_JSON_IMPORT_BYTES} bytes.`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      code: "INVALID_JSON",
      message: "JSON файлът не може да бъде прочетен.",
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      code: "INVALID_ROOT",
      message: "JSON root трябва да е обект.",
    };
  }

  if (parsed.version !== PRODUCT_JSON_IMPORT_VERSION) {
    return {
      ok: false,
      code: "UNSUPPORTED_VERSION",
      message: `Поддържа се само version ${PRODUCT_JSON_IMPORT_VERSION}.`,
    };
  }

  const products = parseProducts(parsed.products);
  if (!products) {
    return {
      ok: false,
      code: "INVALID_ROOT",
      message: "Полето products трябва да е масив.",
    };
  }

  if (products.length === 0) {
    return {
      ok: false,
      code: "EMPTY_PRODUCTS",
      message: "JSON файлът не съдържа продукти.",
    };
  }

  if (products.length > MAX_PRODUCTS_PER_IMPORT) {
    return {
      ok: false,
      code: "TOO_MANY_PRODUCTS",
      message: `Import-ът може да съдържа най-много ${MAX_PRODUCTS_PER_IMPORT} продукта.`,
    };
  }

  const file: ProductImportFileV2 = {
    version: PRODUCT_JSON_IMPORT_VERSION,
    products,
  };

  if (typeof parsed.import_key === "string" && parsed.import_key.trim()) {
    file.import_key = parsed.import_key.trim();
  }

  if (isRecord(parsed.defaults)) {
    file.defaults = parsed.defaults as ProductImportFileV2["defaults"];
  }

  return { ok: true, file };
}
