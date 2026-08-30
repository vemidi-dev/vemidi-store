import type { Product } from "@/lib/catalog";
import { siteConfig } from "@/config/site";
import { normalizeSeoPlainText } from "@/lib/seo/seo-text";
import type { StorefrontCategory, StorefrontProduct } from "@/lib/storefront/types";

import {
  buildGoogleMerchantFeedItem,
  escapeXml,
  filterMerchantFeedProducts,
  renderGoogleMerchantItemXml,
  resolveMerchantProductId,
  type GoogleMerchantFeedInput,
  type GoogleMerchantFeedItem,
} from "@/lib/merchant/google-feed";

export const BAZAR_MERCHANT_FACEBOOK_URL =
  "https://www.facebook.com/profile.php?id=100090185474431";
export const BAZAR_MERCHANT_STORE_URL = "https://vemidi-crafts.com";
export const BAZAR_MERCHANT_SHIPPING_LINE =
  "Изпращаме с Еконт и Спиди до цялата страна.";

const LITERAL_ESCAPED_NEWLINES = /\\r\\n|\\n|\\r/gi;
const HTML_TAG_PATTERN = /<[^>]*>/g;
const BLOCK_BREAK_PATTERN =
  /<\s*\/\s*(p|div|li|h[1-6]|tr|section|article|blockquote)\s*>/gi;
const BR_TAG_PATTERN = /<\s*br\s*\/?>/gi;
const BLOCK_OPEN_PATTERN =
  /<\s*(p|div|li|h[1-6]|tr|section|article|blockquote)(\s[^>]*)?>/gi;

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

function decodeHtmlEntities(text: string): string {
  let decoded = text;
  for (const [pattern, replacement] of HTML_ENTITY_REPLACEMENTS) {
    decoded = decoded.replace(pattern, replacement);
  }
  return decoded;
}

/** Strip HTML while preserving readable paragraph breaks for feed descriptions. */
export function stripHtmlPreserveParagraphs(
  input: string | null | undefined,
): string {
  if (!input) {
    return "";
  }

  let text = input.replace(LITERAL_ESCAPED_NEWLINES, "\n");
  text = text.replace(BR_TAG_PATTERN, "\n");
  text = text.replace(BLOCK_BREAK_PATTERN, "\n\n");
  text = text.replace(BLOCK_OPEN_PATTERN, "");
  text = text.replace(HTML_TAG_PATTERN, " ");
  text = decodeHtmlEntities(text);

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .split(/\n/)
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean);

  return paragraphs.join("\n\n").trim();
}

function appendLabeledSection(
  sections: string[],
  label: string,
  value: string | null | undefined,
  options: { preserveParagraphs?: boolean } = {},
) {
  const normalized = options.preserveParagraphs
    ? stripHtmlPreserveParagraphs(value)
    : normalizeSeoPlainText(value);
  if (!normalized) {
    return;
  }
  sections.push(`${label}:\n${normalized}`);
}

export function resolveBazarMerchantDescription(
  product: Pick<
    Product,
    | "title"
    | "headingSubtitle"
    | "subtitle"
    | "description"
    | "dimensionsMaterials"
  >,
  link: string,
): string {
  const sections: string[] = [];

  appendLabeledSection(sections, "Име", product.title);
  appendLabeledSection(sections, "Подзаглавие", product.headingSubtitle);
  appendLabeledSection(sections, "Кратко резюме", product.subtitle);
  appendLabeledSection(
    sections,
    "Размери и материали",
    product.dimensionsMaterials,
  );
  appendLabeledSection(sections, "За продукта", product.description, {
    preserveParagraphs: true,
  });

  sections.push(`Разгледайте продукта тук:\n${link.trim()}`);
  sections.push(`Facebook:\n${BAZAR_MERCHANT_FACEBOOK_URL}`);
  sections.push(`Магазин:\n${BAZAR_MERCHANT_STORE_URL}`);
  sections.push(BAZAR_MERCHANT_SHIPPING_LINE);

  return sections.join("\n\n");
}

export function buildBazarMerchantFeedItem(
  product: StorefrontProduct,
  siteUrl: URL,
  categories: StorefrontCategory[] = [],
): GoogleMerchantFeedItem | null {
  const item = buildGoogleMerchantFeedItem(product, siteUrl, categories);
  if (!item) {
    return null;
  }

  return {
    ...item,
    description: resolveBazarMerchantDescription(product, item.link),
  };
}

export function buildBazarMerchantFeedXml(input: GoogleMerchantFeedInput): string {
  const siteUrl =
    typeof input.siteUrl === "string" ? new URL(input.siteUrl) : input.siteUrl;
  const categories = input.categories ?? [];
  const eligible = filterMerchantFeedProducts(input.products)
    .slice()
    .sort((left, right) => {
      const leftKey = resolveMerchantProductId(left);
      const rightKey = resolveMerchantProductId(right);
      return leftKey.localeCompare(rightKey, "en");
    });

  const items = eligible
    .map((product) => buildBazarMerchantFeedItem(product, siteUrl, categories))
    .filter((item): item is GoogleMerchantFeedItem => item !== null);

  const channelTitle = input.title?.trim() || siteConfig.name;
  const channelDescription =
    input.description?.trim() || siteConfig.description;
  const channelLink = new URL("/", siteUrl).toString();
  const itemXml = items.map(renderGoogleMerchantItemXml).join("");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
    `<channel>`,
    `<title>${escapeXml(channelTitle)}</title>`,
    `<link>${escapeXml(channelLink)}</link>`,
    `<description>${escapeXml(channelDescription)}</description>`,
    itemXml,
    `</channel>`,
    `</rss>`,
  ].join("");
}

export const BAZAR_MERCHANT_FEED_CONTENT_TYPE = "application/xml; charset=utf-8";
