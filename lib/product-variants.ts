/**
 * Variants system helpers.
 * Rows still live in `product_materials`; option links keep `material_id`.
 */

export const DEFAULT_VARIANT_GROUP_KEY = "material";
export const DEFAULT_VARIANT_GROUP_NAME = "Материал";

export const VARIANT_DISPLAY_SIZES = ["small", "medium", "large"] as const;

export type VariantDisplaySize = (typeof VARIANT_DISPLAY_SIZES)[number];

/** Current storefront material cards: 1 col mobile, 2 cols from `sm` (medium). */
export const DEFAULT_VARIANT_DISPLAY_SIZE: VariantDisplaySize = "medium";

export const VARIANT_DISPLAY_SIZE_LABELS: Record<VariantDisplaySize, string> = {
  small: "Малък",
  medium: "Среден",
  large: "Голям",
};

const DISPLAY_SIZE_RANK: Record<VariantDisplaySize, number> = {
  small: 0,
  medium: 1,
  large: 2,
};

export function isVariantDisplaySize(value: unknown): value is VariantDisplaySize {
  return (
    typeof value === "string" &&
    (VARIANT_DISPLAY_SIZES as readonly string[]).includes(value)
  );
}

export function normalizeVariantDisplaySize(
  value: unknown,
): VariantDisplaySize {
  return isVariantDisplaySize(value) ? value : DEFAULT_VARIANT_DISPLAY_SIZE;
}

/**
 * Storefront grid classes by display size.
 * - small: 2 mobile / up to 4 desktop
 * - medium: 1 mobile / 2 desktop (legacy material cards)
 * - large: 1 per row
 */
export function variantDisplaySizeGridClass(
  size: VariantDisplaySize = DEFAULT_VARIANT_DISPLAY_SIZE,
): string {
  switch (size) {
    case "small":
      return "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4";
    case "large":
      return "grid grid-cols-1 gap-3";
    case "medium":
    default:
      return "grid grid-cols-1 gap-2 sm:grid-cols-2";
  }
}

/**
 * When an option group mixes linked variants with different display sizes,
 * use the **largest** size so cards never look cramped.
 * Empty / missing sizes fall back to medium.
 */
export function resolveOptionGroupVariantDisplaySize(
  sizes: Array<VariantDisplaySize | string | null | undefined>,
): VariantDisplaySize {
  let resolved: VariantDisplaySize | null = null;
  for (const raw of sizes) {
    if (!isVariantDisplaySize(raw)) continue;
    if (!resolved || DISPLAY_SIZE_RANK[raw] > DISPLAY_SIZE_RANK[resolved]) {
      resolved = raw;
    }
  }
  return resolved ?? DEFAULT_VARIANT_DISPLAY_SIZE;
}

const BG_TRANSLIT: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sht",
  ъ: "a",
  ь: "",
  ю: "yu",
  я: "ya",
};

export function slugifyVariantGroupKey(raw: string): string {
  const lowered = raw.trim().toLocaleLowerCase("bg");
  let out = "";
  for (const char of lowered) {
    if (BG_TRANSLIT[char]) {
      out += BG_TRANSLIT[char];
      continue;
    }
    if (/[a-z0-9]/.test(char)) {
      out += char;
      continue;
    }
    if (/\s|-|_/.test(char)) {
      out += "_";
    }
  }
  out = out.replace(/_+/g, "_").replace(/^_|_$/g, "");
  if (!out) {
    out = "group";
  }
  if (!/^[a-z]/.test(out)) {
    out = `g_${out}`;
  }
  return out.slice(0, 64);
}

export const ADMIN_VARIANTS_TAB_LABEL = "Варианти";
export const ADMIN_VARIANT_LINK_LABEL = "Свързан вариант със снимка";
export const ADMIN_VARIANT_LINK_NONE_LABEL = "Без свързан вариант";
