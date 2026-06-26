import type { Product } from "@/lib/catalog";

export const PRODUCT_CARD_BADGES = [
  "Ръчна изработка",
  "По поръчка",
  "Ново",
  "Най-продавано",
] as const;

export type ProductCardBadge = (typeof PRODUCT_CARD_BADGES)[number];

const PRODUCT_CARD_BADGE_SET = new Set<string>(PRODUCT_CARD_BADGES);

export function normalizeProductCardBadge(
  value: string | null | undefined,
): ProductCardBadge | null {
  const trimmed = value?.trim();
  if (!trimmed || !PRODUCT_CARD_BADGE_SET.has(trimmed)) {
    return null;
  }

  return trimmed as ProductCardBadge;
}

export function productHasSelectableOptions(
  product: Pick<
    Product,
    | "customizable"
    | "hasColorOptions"
    | "hasPersonalizationOptions"
    | "colorFields"
    | "personalizationFields"
  >,
): boolean {
  return Boolean(
    product.customizable ||
      product.hasColorOptions ||
      product.hasPersonalizationOptions ||
      (product.colorFields?.length ?? 0) > 0 ||
      (product.personalizationFields?.length ?? 0) > 0,
  );
}

export function getProductCardCtaLabel(
  product: Pick<
    Product,
    | "customizable"
    | "hasColorOptions"
    | "hasPersonalizationOptions"
    | "colorFields"
    | "personalizationFields"
  >,
): "Изберете опции" | "Вижте продукта" {
  return productHasSelectableOptions(product) ? "Изберете опции" : "Вижте продукта";
}

export function resolveProductCardStatusLabel(
  product: Pick<Product, "cardBadge">,
): string | null {
  return product.cardBadge ?? null;
}
