import { makeCreateProductDraft } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import { parseProductCreateDraft } from "@/lib/admin/params";
import type { ProductCreateDraft } from "@/lib/admin/types";

export const PRODUCT_CREATE_LOCAL_DRAFT_KEY =
  "vemidi:admin:create-product-draft:v1";

export const PRODUCT_CREATE_LOCAL_DRAFT_DEBOUNCE_MS = 500;

export type ProductCreateLocalDraft = ProductCreateDraft & {
  savedAt: string | null;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  faqGroupIds: string[];
  faqItemIds: string[];
};

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getIdList(formData: FormData, key: string) {
  return Array.from(
    new Set(
      formData
        .getAll(key)
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
  );
}

/** Serialize create-product FormData for localStorage (richer than URL draft). */
export function serializeProductCreateLocalDraft(formData: FormData): string {
  const base = JSON.parse(makeCreateProductDraft(formData)) as Record<string, unknown>;
  return JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    ...base,
    meta_title: getString(formData, adminFormFields.product.metaTitle),
    meta_description: getString(formData, adminFormFields.product.metaDescription),
    og_title: getString(formData, adminFormFields.product.ogTitle),
    og_description: getString(formData, adminFormFields.product.ogDescription),
    faq_group_ids: getIdList(formData, adminFormFields.product.faqGroupIds),
    faq_item_ids: getIdList(formData, adminFormFields.product.faqItemIds),
  });
}

export function parseProductCreateLocalDraft(
  raw: string,
): ProductCreateLocalDraft | null {
  if (!raw.trim()) {
    return null;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }

  const core = parseProductCreateDraft(JSON.stringify(parsed));
  if (!core) {
    return null;
  }

  return {
    ...core,
    savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : null,
    metaTitle: typeof parsed.meta_title === "string" ? parsed.meta_title : "",
    metaDescription:
      typeof parsed.meta_description === "string" ? parsed.meta_description : "",
    ogTitle: typeof parsed.og_title === "string" ? parsed.og_title : "",
    ogDescription:
      typeof parsed.og_description === "string" ? parsed.og_description : "",
    faqGroupIds: asStringList(parsed.faq_group_ids),
    faqItemIds: asStringList(parsed.faq_item_ids),
  };
}

export function readProductCreateLocalDraft(
  storage: Pick<Storage, "getItem"> | null | undefined = typeof window === "undefined"
    ? null
    : window.localStorage,
): ProductCreateLocalDraft | null {
  if (!storage) {
    return null;
  }
  try {
    return parseProductCreateLocalDraft(storage.getItem(PRODUCT_CREATE_LOCAL_DRAFT_KEY) ?? "");
  } catch {
    return null;
  }
}

export function writeProductCreateLocalDraft(
  formData: FormData,
  storage: Pick<Storage, "setItem"> | null | undefined = typeof window === "undefined"
    ? null
    : window.localStorage,
): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(PRODUCT_CREATE_LOCAL_DRAFT_KEY, serializeProductCreateLocalDraft(formData));
    return true;
  } catch {
    return false;
  }
}

export function clearProductCreateLocalDraft(
  storage: Pick<Storage, "removeItem"> | null | undefined = typeof window === "undefined"
    ? null
    : window.localStorage,
): void {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(PRODUCT_CREATE_LOCAL_DRAFT_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export function shouldClearProductCreateLocalDraftOnSuccess(successMessage: string) {
  return /продуктът е добавен/i.test(successMessage);
}

/**
 * Client-side mirror of server color-field rules for empty option lists.
 * Returns null when OK.
 */
export function validateProductCreateColorFieldsClient(
  formData: FormData,
): string | null {
  const labels = formData
    .getAll(adminFormFields.colorField.labels)
    .map((value) => String(value ?? "").trim());
  const groupIds = formData
    .getAll(adminFormFields.colorField.groupIds)
    .map((value) => String(value ?? "").trim());
  const optionCsvs = formData
    .getAll(adminFormFields.colorField.optionIds)
    .map((value) => String(value ?? "").trim());
  const mins = formData
    .getAll(adminFormFields.colorField.minSelects)
    .map((value) => String(value ?? "").trim());
  const maxes = formData
    .getAll(adminFormFields.colorField.maxSelects)
    .map((value) => String(value ?? "").trim());
  const selectionModes = formData
    .getAll(adminFormFields.colorField.selectionModes)
    .map((value) => String(value ?? "").trim());

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index] ?? "";
    const groupId = groupIds[index] ?? "";
    const optionCsv = optionCsvs[index] ?? "";
    if (!label && !groupId && !optionCsv) {
      continue;
    }
    if (!label || !groupId) {
      return "Всеки избор на цвят трябва да има име и палитра.";
    }

    const optionIds = Array.from(
      new Set(
        optionCsv
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
    if (optionIds.length === 0) {
      return "Изберете поне един разрешен цвят за всяко цветово поле.";
    }

    const selectionMode = selectionModes[index] === "quantity" ? "quantity" : "choice";
    if (selectionMode !== "quantity") {
      const minSelect = Number(mins[index] ?? "0");
      const maxSelect = Number(maxes[index] ?? "1");
      const safeMin = Number.isFinite(minSelect) ? Math.max(0, minSelect) : 0;
      const safeMax = Number.isFinite(maxSelect) ? Math.max(1, maxSelect) : 1;
      if (optionIds.length < safeMin || optionIds.length < safeMax) {
        return "Изберете достатъчно налични цветове за зададения брой клиентски избори.";
      }
    }
  }

  return null;
}
