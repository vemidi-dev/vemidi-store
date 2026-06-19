import type { ProductLandingPageRow } from "@/lib/product-landing/types";

export function applyPrimaryForcesActive(isPrimary: boolean, isActive: boolean) {
  return {
    isPrimary,
    isActive: isPrimary ? true : isActive,
  };
}

export function resolvePrimaryLandingSwitch(
  rows: readonly ProductLandingPageRow[],
  productId: string,
  landingId: string | null,
  nextRow: Pick<
    ProductLandingPageRow,
    "id" | "product_id" | "is_primary" | "is_active"
  >,
): ProductLandingPageRow[] {
  const normalized = applyPrimaryForcesActive(nextRow.is_primary, nextRow.is_active);

  return rows.map((row) => {
    if (row.product_id !== productId) {
      return row;
    }

    if (row.id === nextRow.id) {
      return {
        ...row,
        is_primary: normalized.isPrimary,
        is_active: normalized.isActive,
      };
    }

    if (normalized.isPrimary && row.is_primary) {
      return {
        ...row,
        is_primary: false,
      };
    }

    return row;
  });
}

export function countPrimaryLandingsForProduct(
  rows: readonly ProductLandingPageRow[],
  productId: string,
) {
  return rows.filter((row) => row.product_id === productId && row.is_primary).length;
}
