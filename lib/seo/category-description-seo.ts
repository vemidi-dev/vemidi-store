import { buildCategoryRecordMetaDescription } from "@/lib/seo/category-page-content";
import type { StorefrontCategory } from "@/lib/storefront/types";

export function buildCategoryMetaDescription(
  category: StorefrontCategory,
): string {
  return buildCategoryRecordMetaDescription(
    category,
    `Разгледайте ръчно изработени продукти в категория „${category.name}" от VeMiDi crafts.`,
  );
}

export function buildOccasionMetaDescription(
  occasion: StorefrontCategory,
): string {
  return buildCategoryRecordMetaDescription(
    occasion,
    `Открийте персонализирани подаръци за „${occasion.name}" от VeMiDi crafts.`,
  );
}
