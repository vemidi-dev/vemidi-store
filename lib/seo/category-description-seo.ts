import {
  normalizeSeoPlainText,
  truncateSeoDescription,
} from "@/lib/seo/seo-text";
import type { StorefrontCategory } from "@/lib/storefront/types";

export function buildCategoryMetaDescription(
  category: StorefrontCategory,
): string {
  const fromCard = normalizeSeoPlainText(category.card_description);
  const base =
    fromCard ||
    `Разгледайте ръчно изработени продукти в категория „${category.name}“ от VeMiDi crafts.`;

  return truncateSeoDescription(base) || base;
}
