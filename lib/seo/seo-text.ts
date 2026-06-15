/** Default max length for HTML meta descriptions (Google snippet guidance). */
export const SEO_META_DESCRIPTION_MAX_LENGTH = 155;

/** Minimum length before we prefer a composed fallback over a thin source. */
export const SEO_META_DESCRIPTION_MIN_LENGTH = 120;

const LITERAL_ESCAPED_NEWLINES = /\\r\\n|\\n|\\r/gi;
const HTML_TAG_PATTERN = /<[^>]*>/g;
const REAL_LINE_BREAK_PATTERN = /[\r\n\u2028\u2029]+/g;
/** Includes NBSP and narrow no-break space — not always covered by `\s` without /u. */
const UNICODE_SPACE_PATTERN = /[\u00A0\u202F\u2007\u2009\u200A\u3000]+/g;
const WHITESPACE_PATTERN = /\s+/g;
const NUMERIC_DECIMAL_ENTITY_PATTERN = /&#(\d+);/g;
const NUMERIC_HEX_ENTITY_PATTERN = /&#x([0-9a-f]+);/gi;

const HTML_ENTITY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/&nbsp;/gi, " "],
  [/&amp;/gi, "&"],
  [/&lt;/gi, "<"],
  [/&gt;/gi, ">"],
  [/&quot;/gi, '"'],
  [/&apos;/gi, "'"],
  [/&#39;/g, "'"],
  [/&#x27;/gi, "'"],
];

/**
 * Normalizes plain text for SEO metadata and JSON-LD (not for visible body copy).
 * Strips HTML, decodes common entities, collapses whitespace and line breaks.
 */
export function normalizeSeoPlainText(input: string | null | undefined): string {
  if (!input) {
    return "";
  }

  let text = input.replace(LITERAL_ESCAPED_NEWLINES, " ");
  text = text.replace(HTML_TAG_PATTERN, " ");

  for (const [pattern, replacement] of HTML_ENTITY_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  text = text.replace(NUMERIC_DECIMAL_ENTITY_PATTERN, (_, code: string) => {
    const value = Number(code);
    return Number.isFinite(value) && value > 0 && value <= 0x10ffff
      ? String.fromCodePoint(value)
      : " ";
  });
  text = text.replace(NUMERIC_HEX_ENTITY_PATTERN, (_, hex: string) => {
    const value = Number.parseInt(hex, 16);
    return Number.isFinite(value) && value > 0 && value <= 0x10ffff
      ? String.fromCodePoint(value)
      : " ";
  });

  text = text.replace(REAL_LINE_BREAK_PATTERN, " ");
  text = text.replace(UNICODE_SPACE_PATTERN, " ");
  text = text.replace(WHITESPACE_PATTERN, " ").trim();

  return text;
}

/**
 * Truncates to maxLength without cutting mid-word when a word boundary exists.
 */
export function truncateSeoDescription(
  text: string,
  maxLength = SEO_META_DESCRIPTION_MAX_LENGTH,
): string {
  const normalized = normalizeSeoPlainText(text);
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const slice = normalized.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");

  if (lastSpace > Math.floor(maxLength * 0.6)) {
    return slice.slice(0, lastSpace).trim();
  }

  return slice.trim();
}
