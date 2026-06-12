export const PRODUCT_CODE_PREFIX = "VM-";
export const PRODUCT_CODE_WIDTH = 6;
export const PRODUCT_CODE_PATTERN = /^VM-[0-9]{6}$/;

export type ProductCodeSequenceState = {
  /** Value passed to PostgreSQL setval(seq, value, is_called). */
  setvalValue: number;
  /** Third argument to setval: false => next nextval() returns setvalValue. */
  isCalled: boolean;
};

export type BackfillProductRow = {
  id: string;
  createdAt: string;
};

/**
 * Mirrors migration #34 backfill: row_number() over (order by created_at, id).
 */
export function assignBackfillProductCodes(
  products: readonly BackfillProductRow[],
): Map<string, string> {
  const assignments = new Map<string, string>();
  const sorted = [...products].sort((left, right) => {
    const byCreatedAt = left.createdAt.localeCompare(right.createdAt);
    return byCreatedAt !== 0 ? byCreatedAt : left.id.localeCompare(right.id);
  });

  sorted.forEach((product, index) => {
    assignments.set(product.id, formatProductCode(index + 1));
  });

  return assignments;
}

export function formatProductCode(sequenceValue: number): string {
  if (!Number.isInteger(sequenceValue) || sequenceValue < 1) {
    throw new Error("Product code sequence value must be a positive integer.");
  }

  return `${PRODUCT_CODE_PREFIX}${String(sequenceValue).padStart(PRODUCT_CODE_WIDTH, "0")}`;
}

export function parseProductCodeNumber(productCode: string): number | null {
  const match = productCode.match(/^VM-(\d{6})$/);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * Sequence state after migration backfill.
 *
 * PostgreSQL semantics:
 * - setval(seq, 1, false)  => next nextval() returns 1  (empty catalog)
 * - setval(seq, N, true)   => next nextval() returns N+1 (N existing codes)
 */
export function resolveProductCodeSequenceState(
  existingCodes: readonly string[],
): ProductCodeSequenceState {
  const numbers = existingCodes
    .map(parseProductCodeNumber)
    .filter((value): value is number => value !== null);

  if (numbers.length === 0) {
    return { setvalValue: 1, isCalled: false };
  }

  return { setvalValue: Math.max(...numbers), isCalled: true };
}

export function nextProductCodeAfterSequenceState(state: ProductCodeSequenceState): string {
  const nextValue = state.isCalled ? state.setvalValue + 1 : state.setvalValue;
  return formatProductCode(nextValue);
}

export type ProductCodeCallerRole = "anon" | "authenticated" | "service_role";

export type ProductCodeAccessAttempt = {
  role: ProductCodeCallerRole;
  isAdmin: boolean;
};

export type ProductCodeAccessResult =
  | { allowed: true }
  | { allowed: false; reason: "missing_execute_grant" | "admin_required" };

/**
 * Mirrors migration #34 access control for next_product_code():
 * - SECURITY DEFINER + assert_admin() before nextval()
 * - EXECUTE granted only to authenticated
 * - sequence privileges revoked from client roles
 */
export function evaluateProductCodeAccess(
  attempt: ProductCodeAccessAttempt,
): ProductCodeAccessResult {
  if (attempt.role === "anon") {
    return { allowed: false, reason: "missing_execute_grant" };
  }

  if (attempt.role === "authenticated" && !attempt.isAdmin) {
    return { allowed: false, reason: "admin_required" };
  }

  return { allowed: true };
}

export function applyBackfillProductCodes(
  products: readonly BackfillProductRow[],
  existingCodes: ReadonlyMap<string, string | null | undefined> = new Map(),
): Map<string, string> {
  const generated = assignBackfillProductCodes(products);
  const merged = new Map<string, string>();

  for (const product of products) {
    const preserved = existingCodes.get(product.id)?.trim();
    merged.set(product.id, preserved || generated.get(product.id)!);
  }

  return merged;
}
