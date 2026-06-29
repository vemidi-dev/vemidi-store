import { validateProductSlug } from "@/lib/product-slug";
import type { ProductPublicationStatus } from "@/lib/product-publication";

export type ProductPublishValidationInput = {
  name: string;
  slug: string;
  price: number | null;
  categoryIds: string[];
  primaryCategoryId: string | null;
  imageCount: number;
  subtitle: string | null;
};

export type ProductPublishValidationIssue = {
  field: string;
  message: string;
};

export function validateProductPublishReady(
  input: ProductPublishValidationInput,
): ProductPublishValidationIssue[] {
  const issues: ProductPublishValidationIssue[] = [];

  if (!input.name.trim()) {
    issues.push({ field: "name", message: "Добавете име на продукта." });
  }

  const slugResult = validateProductSlug(input.slug);
  if (!slugResult.ok) {
    issues.push({
      field: "slug",
      message: "Добавете валиден URL адрес (slug) за продукта.",
    });
  }

  if (input.price === null || Number.isNaN(input.price) || input.price < 0) {
    issues.push({ field: "price", message: "Добавете валидна цена." });
  }

  if (input.categoryIds.length === 0) {
    issues.push({
      field: "category",
      message: "Изберете поне една категория.",
    });
  }

  if (!input.primaryCategoryId) {
    issues.push({
      field: "primaryCategory",
      message: "Изберете основна продуктова категория.",
    });
  }

  if (input.imageCount < 1) {
    issues.push({
      field: "images",
      message: "Качете поне една снимка.",
    });
  }

  if (!input.subtitle?.trim()) {
    issues.push({
      field: "subtitle",
      message: "Добавете кратко резюме на продукта.",
    });
  }

  return issues;
}

export function formatProductPublishValidationMessage(
  issues: ProductPublishValidationIssue[],
): string {
  if (issues.length === 0) {
    return "";
  }

  if (issues.length === 1) {
    return `Продуктът не може да бъде публикуван: ${issues[0].message}`;
  }

  return `Продуктът не може да бъде публикуван: ${issues
    .map((issue) => issue.message)
    .join(" ")}`;
}

export function requiresProductPublishValidation(
  status: ProductPublicationStatus,
): boolean {
  return status === "published";
}
