import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getCategoryDisplayLabel,
  sortCategoriesForDisplay,
  type HierarchicalCategory,
} from "@/lib/category-hierarchy";
import { adminFormFields } from "@/lib/admin/form-fields";

export type CategoryRelatedRow = {
  category_id: string;
  related_category_id: string;
  sort_order: number;
};

export type CategoryRelatedValidationCategory = {
  id: string;
  name: string;
  category_type: "product" | "occasion";
  parent_id: string | null;
};

export type CategoryRelatedSelectorCategory = CategoryRelatedValidationCategory &
  HierarchicalCategory & {
    slug: string;
    is_visible?: boolean;
  };

export type CategoryRelatedSelectorOption = {
  id: string;
  slug: string;
  label: string;
};

export function filterSelectableRelatedCategories(
  categories: CategoryRelatedSelectorCategory[],
  options: {
    excludeCategoryId?: string | null;
  } = {},
): CategoryRelatedSelectorCategory[] {
  const directChildIds = new Set(
    options.excludeCategoryId
      ? categories
          .filter((category) => category.parent_id === options.excludeCategoryId)
          .map((category) => category.id)
      : [],
  );

  return categories.filter((category) => {
    if (category.category_type !== "product") {
      return false;
    }

    if (category.is_visible === false) {
      return false;
    }

    if (options.excludeCategoryId && category.id === options.excludeCategoryId) {
      return false;
    }

    if (directChildIds.has(category.id)) {
      return false;
    }

    return true;
  });
}

export function buildRelatedCategorySelectorOptions(
  categories: CategoryRelatedSelectorCategory[],
  options: {
    excludeCategoryId?: string | null;
  } = {},
): CategoryRelatedSelectorOption[] {
  return sortCategoriesForDisplay(
    filterSelectableRelatedCategories(categories, options),
  ).map((category) => ({
    id: category.id,
    slug: category.slug,
    label: getCategoryDisplayLabel(categories, category),
  }));
}

export function parseRelatedCategoryIdsFromFormData(formData: FormData): string[] {
  const seen = new Set<string>();
  const relatedCategoryIds: string[] = [];

  for (const value of formData.getAll(adminFormFields.category.relatedCategoryIds)) {
    const relatedCategoryId = String(value).trim();
    if (!relatedCategoryId || seen.has(relatedCategoryId)) {
      continue;
    }

    seen.add(relatedCategoryId);
    relatedCategoryIds.push(relatedCategoryId);
  }

  return relatedCategoryIds;
}

export function buildCategoryRelatedCategoryRows(
  categoryId: string,
  relatedCategoryIds: string[],
): CategoryRelatedRow[] {
  return relatedCategoryIds.map((relatedCategoryId, index) => ({
    category_id: categoryId,
    related_category_id: relatedCategoryId,
    sort_order: (index + 1) * 10,
  }));
}

export function validateCategoryRelatedTargets(
  categoryId: string,
  relatedCategoryIds: string[],
  categories: CategoryRelatedValidationCategory[],
  sourceCategoryType: "product" | "occasion",
): string | null {
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  for (const relatedCategoryId of relatedCategoryIds) {
    if (relatedCategoryId === categoryId) {
      return "Категорията не може да бъде свързана със себе си.";
    }

    const target = categoryById.get(relatedCategoryId);
    if (!target) {
      return "Избрана е невалидна свързана категория.";
    }

    if (sourceCategoryType === "product" && target.category_type === "occasion") {
      return "Продуктовата категория не може да сочи към повод като свързана категория.";
    }

    if (target.parent_id === categoryId) {
      return `„${target.name}" вече е подкатегория и не може да се добави като свързана категория.`;
    }
  }

  return null;
}

export function isCategoryRelatedCategoriesMigrationMissing(
  error: { message: string } | null,
): boolean {
  if (!error) {
    return false;
  }

  return error.message.includes("category_related_categories");
}

export async function loadCategoryRelatedValidationCategories(
  supabase: SupabaseClient,
): Promise<CategoryRelatedValidationCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,category_type,parent_id");

  if (error) {
    return [];
  }

  return (data ?? []) as CategoryRelatedValidationCategory[];
}

export async function syncCategoryRelatedCategories(
  supabase: SupabaseClient,
  categoryId: string,
  relatedCategoryIds: string[],
): Promise<string | null> {
  const { error: deleteError } = await supabase
    .from("category_related_categories")
    .delete()
    .eq("category_id", categoryId);

  if (deleteError) {
    if (isCategoryRelatedCategoriesMigrationMissing(deleteError)) {
      return "Липсва миграцията category_related_categories.sql в Supabase.";
    }

    return `Свързаните категории не бяха обновени: ${deleteError.message}`;
  }

  if (relatedCategoryIds.length === 0) {
    return null;
  }

  const { error: insertError } = await supabase
    .from("category_related_categories")
    .insert(buildCategoryRelatedCategoryRows(categoryId, relatedCategoryIds));

  if (insertError) {
    if (isCategoryRelatedCategoriesMigrationMissing(insertError)) {
      return "Липсва миграцията category_related_categories.sql в Supabase.";
    }

    return `Свързаните категории не бяха запазени: ${insertError.message}`;
  }

  return null;
}
