import type { PostgrestError } from "@supabase/supabase-js";

export const DUPLICATE_EXCLUDED_RELATIONS = [
  "home_featured_products",
  "related_products",
  "product_promotions",
] as const;

export const DUPLICATE_RESET_FIELDS = {
  isSoldOut: false,
  imageUrl: null,
} as const;

export type SourceOptionGroup = {
  id: string;
  dependsOnOptionId: string | null;
};

export type SourceOptionValue = {
  id: string;
  groupId: string;
};

export type RemappedOptionIds = {
  groupIdMap: Map<string, string>;
  valueIdMap: Map<string, string>;
  remappedDependencies: Map<string, string | null>;
};

export function buildDuplicateProductName(originalName: string) {
  const trimmed = originalName.trim();
  return trimmed ? `Копие на ${trimmed}` : "Копие на продукт";
}

export function createIdMap(ids: string[]) {
  const map = new Map<string, string>();
  ids.forEach((id) => {
    map.set(id, `new-${id}`);
  });
  return map;
}

export function remapOptionDependencies(
  groups: SourceOptionGroup[],
  values: SourceOptionValue[],
  groupIdMap: Map<string, string>,
  valueIdMap: Map<string, string>,
): RemappedOptionIds {
  const remappedDependencies = new Map<string, string | null>();

  for (const group of groups) {
    const newGroupId = groupIdMap.get(group.id);
    if (!newGroupId) {
      throw new Error("invalid_option_group");
    }

    if (!group.dependsOnOptionId) {
      remappedDependencies.set(newGroupId, null);
      continue;
    }

    const remappedValueId = valueIdMap.get(group.dependsOnOptionId);
    if (!remappedValueId) {
      throw new Error("invalid_option_dependency");
    }

    const value = values.find((entry) => entry.id === group.dependsOnOptionId);
    if (!value) {
      throw new Error("invalid_option_dependency");
    }

    const dependencyGroupId = groupIdMap.get(value.groupId);
    if (!dependencyGroupId) {
      throw new Error("invalid_option_dependency");
    }

    remappedDependencies.set(newGroupId, remappedValueId);
  }

  return {
    groupIdMap,
    valueIdMap,
    remappedDependencies,
  };
}

export const DUPLICATE_COPY_IMAGES_FIELD = "duplicate_copy_images";

export function shouldCopyDuplicateImages(
  formData: Pick<FormData, "get">,
) {
  const value = String(formData.get(DUPLICATE_COPY_IMAGES_FIELD) ?? "").trim();
  return value === "true" || value === "on" || value === "1";
}

export function buildDuplicateSuccessMessage(
  imageWarning?: string | null,
  options?: { copyImagesRequested?: boolean },
) {
  if (imageWarning) {
    return `Копието е създадено. ${imageWarning}`;
  }

  if (options?.copyImagesRequested === false) {
    return "Копието е създадено. Добавете снимки към новия продукт.";
  }

  return "Копието е създадено";
}

export const DUPLICATE_PRODUCT_CONFIRM_MESSAGE =
  "Ще бъде създаден нов продукт с копие на последната запазена версия. Незапазените промени в отворена форма няма да бъдат включени. Оригиналният продукт остава непроменен.";

export const DUPLICATE_MISSING_IMAGES_NOTICE =
  "Този продукт няма снимки. Качете поне една снимка, за да се показва коректно в магазина.";

export const DUPLICATE_IMAGE_WARNING =
  "Изображенията не бяха копирани. Добавете ги ръчно към новия продукт.";

const duplicateErrorMessages: Record<string, string> = {
  admin_required: "Нямате администраторски права.",
  product_not_found: "Продуктът не беше намерен.",
  invalid_option_dependency: "Копирането не успя поради невалидна зависимост между опции.",
};

export function getDuplicateProductErrorMessage(
  error: Pick<PostgrestError, "code" | "message" | "details" | "hint"> | null | undefined,
) {
  const message = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");

  if (!message) {
    return "Копирането на продукта не успя.";
  }

  if (message.includes("Could not find the function")) {
    return "Липсва Supabase миграцията admin_duplicate_product. Изпълнете duplicate_product.sql.";
  }

  if (
    error?.code === "42501" ||
    message.toLowerCase().includes("permission denied")
  ) {
    return "Липсват права за запис. Изпълнете restore_admin_product_write_grants.sql в Supabase.";
  }

  const knownError = Object.entries(duplicateErrorMessages).find(([code]) =>
    message.includes(code),
  );
  return knownError?.[1] ?? "Копирането на продукта не успя.";
}
