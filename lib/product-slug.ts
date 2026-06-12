import { isUuid } from "@/lib/is-uuid";

export const PRODUCT_SLUG_MAX_LENGTH = 80;

const CYRILLIC_TO_LATIN: Record<string, string> = {
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

export type ProductSlugValidationResult =
  | { ok: true; slug: string }
  | { ok: false; code: "empty" | "invalid" | "uuid" | "too_long" };

function transliterateCharacter(character: string) {
  const lower = character.toLowerCase();
  if (CYRILLIC_TO_LATIN[lower]) {
    return CYRILLIC_TO_LATIN[lower];
  }
  return lower;
}

export function transliterateBulgarianToLatin(value: string) {
  return [...value].map(transliterateCharacter).join("");
}

export function slugifyProductName(name: string) {
  const transliterated = transliterateBulgarianToLatin(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[«»„“”"'`´]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase();

  return transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PRODUCT_SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

export function validateProductSlug(raw: string): ProductSlugValidationResult {
  const slug = raw.trim().toLowerCase();

  if (!slug) {
    return { ok: false, code: "empty" };
  }

  if (slug.length > PRODUCT_SLUG_MAX_LENGTH) {
    return { ok: false, code: "too_long" };
  }

  if (isUuid(slug)) {
    return { ok: false, code: "uuid" };
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, code: "invalid" };
  }

  return { ok: true, slug };
}

export function appendProductSlugSuffix(
  base: string,
  suffix: number,
  maxLength = PRODUCT_SLUG_MAX_LENGTH,
): string {
  const normalizedBase = base.replace(/-+$/g, "");
  if (suffix <= 1) {
    return normalizedBase.slice(0, maxLength).replace(/-+$/g, "");
  }

  const suffixText = `-${suffix}`;
  if (normalizedBase.length + suffixText.length <= maxLength) {
    return `${normalizedBase}${suffixText}`;
  }

  const trimmedBase = normalizedBase
    .slice(0, maxLength - suffixText.length)
    .replace(/-+$/g, "");
  if (!trimmedBase) {
    throw new Error("Slug base is too short to append a uniqueness suffix.");
  }

  return `${trimmedBase}${suffixText}`;
}

export function uniquifyProductSlug(baseSlug: string, takenSlugs: ReadonlySet<string>) {
  const normalizedBase = slugifyProductName(baseSlug) || "product";
  if (!takenSlugs.has(normalizedBase)) {
    return normalizedBase;
  }

  let suffix = 2;
  while (suffix < 10_000) {
    const candidate = appendProductSlugSuffix(normalizedBase, suffix);
    if (!takenSlugs.has(candidate)) {
      return candidate;
    }
    suffix += 1;
  }

  return appendProductSlugSuffix(
    normalizedBase.slice(0, PRODUCT_SLUG_MAX_LENGTH - 9),
    Number(Date.now().toString(36).slice(-4)),
  );
}

export function suggestProductSlugFromName(name: string) {
  return slugifyProductName(name);
}

export type BackfillSlugProduct = {
  id: string;
  name: string;
};

/**
 * Mirrors migration #34 slug backfill: only assign when slug is missing.
 */
export function applyBackfillSlugs(
  products: readonly BackfillSlugProduct[],
  existingSlugs: ReadonlyMap<string, string | null | undefined> = new Map(),
): Map<string, string> {
  const taken = new Set<string>();
  const assignments = new Map<string, string>();

  for (const value of existingSlugs.values()) {
    const normalized = value?.trim().toLowerCase();
    if (normalized) {
      taken.add(normalized);
    }
  }

  for (const product of products) {
    const preserved = existingSlugs.get(product.id)?.trim().toLowerCase();
    if (preserved) {
      assignments.set(product.id, preserved);
      continue;
    }

    const slug = uniquifyProductSlug(product.name, taken);
    assignments.set(product.id, slug);
    taken.add(slug);
  }

  return assignments;
}

/** Prevents redirect loops when a historical slug already matches the canonical target. */
export function shouldRedirectHistoricalSlug(
  requestedSlug: string,
  targetSlug: string | null | undefined,
): boolean {
  const target = targetSlug?.trim().toLowerCase();
  const requested = requestedSlug.trim().toLowerCase();
  return Boolean(target && target !== requested);
}

export function isHistoricalSlugConflict(
  slug: string,
  productId: string,
  history: ReadonlyArray<{ slug: string; productId: string }>,
): boolean {
  const normalized = slug.trim().toLowerCase();
  const existing = history.find((entry) => entry.slug === normalized);
  return Boolean(existing && existing.productId !== productId);
}

export function suggestDuplicateProductSlug(sourceSlug: string) {
  const base = sourceSlug.trim().toLowerCase();
  if (!base) {
    return "copy";
  }
  if (base.endsWith("-copy")) {
    return base;
  }
  const candidate = `${base}-copy`;
  return candidate.length <= PRODUCT_SLUG_MAX_LENGTH
    ? candidate
    : `${base.slice(0, PRODUCT_SLUG_MAX_LENGTH - 5)}-copy`;
}

export const productSlugErrorMessages: Record<
  Exclude<ProductSlugValidationResult, { ok: true }>["code"],
  string
> = {
  empty: "SEO адресът е задължителен.",
  invalid:
    "SEO адресът може да съдържа само малки латински букви, цифри и единични тирета.",
  uuid: "SEO адресът не може да бъде UUID.",
  too_long: `SEO адресът не може да надвишава ${PRODUCT_SLUG_MAX_LENGTH} символа.`,
};
