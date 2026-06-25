import { getString, isChecked } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { FaqGroupScope } from "@/lib/faq/types";
import { slugifyProductName } from "@/lib/product-slug";

export function normalizeFaqSlug(raw: string, fallbackName = ""): string | null {
  const candidate = slugifyProductName(raw || fallbackName);
  return candidate || null;
}

export function parseFaqGroupScope(value: string): FaqGroupScope | null {
  return value === "global" || value === "product" ? value : null;
}

export function parseFaqGroupForm(formData: FormData): {
  name: string;
  slug: string | null;
  scope: FaqGroupScope | null;
  sortOrder: number;
  isActive: boolean;
  error: string | null;
} {
  const name = getString(formData, adminFormFields.faq.groupName);
  const rawSlug = getString(formData, adminFormFields.faq.groupSlug);
  const scope = parseFaqGroupScope(getString(formData, adminFormFields.faq.groupScope));
  const sortOrder = parseNonNegativeInt(
    getString(formData, adminFormFields.faq.groupSortOrder),
    0,
  );
  const isActive = isChecked(formData, adminFormFields.faq.groupIsActive);

  if (!name) {
    return {
      name: "",
      slug: null,
      scope: null,
      sortOrder,
      isActive,
      error: "Въведете име на групата.",
    };
  }

  const slug = normalizeFaqSlug(rawSlug, name);
  if (!slug) {
    return {
      name,
      slug: null,
      scope,
      sortOrder,
      isActive,
      error: "Въведете валиден slug за групата.",
    };
  }

  if (!scope) {
    return {
      name,
      slug,
      scope: null,
      sortOrder,
      isActive,
      error: "Изберете обхват на групата.",
    };
  }

  return { name, slug, scope, sortOrder, isActive, error: null };
}

export function parseFaqItemForm(formData: FormData): {
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  error: string | null;
} {
  const question = getString(formData, adminFormFields.faq.itemQuestion);
  const answer = getString(formData, adminFormFields.faq.itemAnswer);
  const sortOrder = parseNonNegativeInt(
    getString(formData, adminFormFields.faq.itemSortOrder),
    0,
  );
  const isActive = isChecked(formData, adminFormFields.faq.itemIsActive);

  if (!question) {
    return { question: "", answer, sortOrder, isActive, error: "Въпросът не може да е празен." };
  }
  if (!answer) {
    return { question, answer: "", sortOrder, isActive, error: "Отговорът не може да е празен." };
  }

  return { question, answer, sortOrder, isActive, error: null };
}

export function getFaqGroupItemIds(formData: FormData): string[] {
  return uniqueIds(
    formData.getAll(adminFormFields.faq.groupItemIds).map((value) => String(value ?? "").trim()),
  );
}

export function getProductFaqGroupIds(formData: FormData): string[] {
  return uniqueIds(
    formData
      .getAll(adminFormFields.product.faqGroupIds)
      .map((value) => String(value ?? "").trim()),
  );
}

export function getProductFaqItemIds(formData: FormData): string[] {
  return uniqueIds(
    formData
      .getAll(adminFormFields.product.faqItemIds)
      .map((value) => String(value ?? "").trim()),
  );
}

export function validateProductFaqGroupSelection(
  selectedGroupIds: string[],
  eligibleGroupIds: Set<string>,
): string | null {
  const invalid = selectedGroupIds.filter((id) => !eligibleGroupIds.has(id));
  if (invalid.length > 0) {
    return "Избрана е невалидна или глобална FAQ група.";
  }
  return null;
}

export function validateProductFaqItemSelection(
  selectedItemIds: string[],
  knownItemIds: Set<string>,
): string | null {
  const invalid = selectedItemIds.filter((id) => !knownItemIds.has(id));
  if (invalid.length > 0) {
    return "Избран е невалиден FAQ въпрос.";
  }
  return null;
}

export function isFaqSlugConflictError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  return message.includes("faq_groups_slug_unique") || message.includes("duplicate key");
}

function parseNonNegativeInt(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function uniqueIds(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
