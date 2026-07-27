import type { SiteContent } from "@/lib/content/site-content";

export type ProductServiceBlockIcon =
  | "clock"
  | "truck"
  | "return"
  | "shield"
  | "package";

export type ProductServiceBlockId = "production" | "delivery" | "returns";

export type ProductServiceBlock = {
  id: ProductServiceBlockId;
  title: string;
  text: string;
  linkLabel: string | null;
  linkHref: string | null;
  icon: ProductServiceBlockIcon;
};

export type ProductPageCopy = {
  priceSummaryLabel: string;
  priceSummaryLabelStock: string;
  priceSummaryNote: string;
  serviceBlocks: ProductServiceBlock[];
};

const SERVICE_BLOCK_IDS: ProductServiceBlockId[] = [
  "production",
  "delivery",
  "returns",
];

const DEFAULT_SERVICE_BLOCK_ICONS: Record<ProductServiceBlockId, ProductServiceBlockIcon> =
  {
    production: "clock",
    delivery: "truck",
    returns: "return",
  };

function trimToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function resolveServiceBlockIcon(
  value: string,
  fallback: ProductServiceBlockIcon,
): ProductServiceBlockIcon {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "clock" ||
    normalized === "truck" ||
    normalized === "return" ||
    normalized === "shield" ||
    normalized === "package"
  ) {
    return normalized;
  }

  return fallback;
}

function resolveServiceBlock(
  content: SiteContent,
  id: ProductServiceBlockId,
): ProductServiceBlock | null {
  const title = content[`product.service.${id}.title` as keyof SiteContent]?.trim();
  const text = content[`product.service.${id}.text` as keyof SiteContent]?.trim();

  if (!title && !text) {
    return null;
  }

  const iconValue =
    content[`product.service.${id}.icon` as keyof SiteContent] ?? "";

  return {
    id,
    title: title ?? "",
    text: text ?? "",
    linkLabel: trimToNull(
      content[`product.service.${id}.link_label` as keyof SiteContent] ?? "",
    ),
    linkHref: trimToNull(
      content[`product.service.${id}.link_href` as keyof SiteContent] ?? "",
    ),
    icon: resolveServiceBlockIcon(iconValue, DEFAULT_SERVICE_BLOCK_ICONS[id]),
  };
}

export function resolveProductPageCopy(content: SiteContent): ProductPageCopy {
  return {
    priceSummaryLabel: content["product.price_summary_label"],
    priceSummaryLabelStock: content["product.price_summary_label_stock"],
    priceSummaryNote: content["product.price_summary_note"],
    serviceBlocks: SERVICE_BLOCK_IDS.map((id) => resolveServiceBlock(content, id)).filter(
      (block): block is ProductServiceBlock => Boolean(block),
    ),
  };
}

export function getPriceSummaryLabel(
  copy: ProductPageCopy,
  usesStockLayout: boolean,
): string {
  const configured = usesStockLayout
    ? copy.priceSummaryLabelStock
    : copy.priceSummaryLabel;
  const trimmed = configured.trim();

  if (trimmed) {
    return trimmed;
  }

  return usesStockLayout ? "Цена за избрания вариант" : "Ориентировъчна цена";
}

export function getPriceSummaryNote(
  copy: ProductPageCopy,
  usesStockLayout: boolean,
): string | null {
  if (usesStockLayout) {
    return null;
  }

  const trimmed = copy.priceSummaryNote.trim();
  return trimmed.length ? trimmed : null;
}
