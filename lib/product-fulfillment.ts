export const PRODUCT_FULFILLMENT_TYPES = [
  "made_to_order",
  "stocked",
  "unavailable",
] as const;

export type ProductFulfillmentType = (typeof PRODUCT_FULFILLMENT_TYPES)[number];

export type ProductFulfillmentInput = {
  soldOut?: boolean;
  fulfillmentType?: ProductFulfillmentType | string | null;
  stockQuantity?: number | null;
};

export type ProductAvailability = {
  fulfillmentType: ProductFulfillmentType;
  orderable: boolean;
  availabilityLabel: string;
};

const FULFILLMENT_LABELS: Record<ProductFulfillmentType, string> = {
  made_to_order: "Изработва се по поръчка",
  stocked: "В наличност",
  unavailable: "Временно недостъпен",
};

export function normalizeFulfillmentType(
  value: string | null | undefined,
): ProductFulfillmentType {
  if (value === "stocked" || value === "unavailable") {
    return value;
  }
  return "made_to_order";
}

export function parseStockQuantity(
  value: FormDataEntryValue | string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function validateFulfillmentInput(
  fulfillmentType: ProductFulfillmentType,
  stockQuantity: number | null,
): string | null {
  if (fulfillmentType === "stocked") {
    if (stockQuantity === null) {
      return "Въведете цяло число за складовата наличност.";
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return "Складовата наличност трябва да е цяло число >= 0.";
    }
    return null;
  }

  if (stockQuantity !== null) {
    return "Количество се задава само при режим „Складова наличност“.";
  }

  return null;
}

export function resolveProductAvailability(
  input: ProductFulfillmentInput,
): ProductAvailability {
  const fulfillmentType = normalizeFulfillmentType(input.fulfillmentType);
  const stockQuantity =
    typeof input.stockQuantity === "number" && Number.isFinite(input.stockQuantity)
      ? Math.max(0, Math.floor(input.stockQuantity))
      : null;

  if (input.soldOut) {
    return {
      fulfillmentType,
      orderable: false,
      availabilityLabel: "Изчерпан",
    };
  }

  if (fulfillmentType === "unavailable") {
    return {
      fulfillmentType,
      orderable: false,
      availabilityLabel: FULFILLMENT_LABELS.unavailable,
    };
  }

  if (fulfillmentType === "stocked" && (stockQuantity ?? 0) <= 0) {
    return {
      fulfillmentType,
      orderable: false,
      availabilityLabel: "Изчерпан",
    };
  }

  return {
    fulfillmentType,
    orderable: true,
    availabilityLabel: FULFILLMENT_LABELS[fulfillmentType],
  };
}

export function isProductOrderable(product: ProductFulfillmentInput): boolean {
  return resolveProductAvailability(product).orderable;
}

export function getProductAvailabilityLabel(product: ProductFulfillmentInput): string {
  return resolveProductAvailability(product).availabilityLabel;
}

export function aggregateCartDemand(
  lines: Array<{ productId: string; quantity: number }>,
): Map<string, number> {
  const demand = new Map<string, number>();

  for (const line of lines) {
    const productId = line.productId.trim();
    const quantity = Math.floor(line.quantity);
    if (!productId || quantity < 1) {
      continue;
    }
    demand.set(productId, (demand.get(productId) ?? 0) + quantity);
  }

  return demand;
}

export function resolveMaxCartQuantity(
  input: ProductFulfillmentInput,
): number | undefined {
  const availability = resolveProductAvailability(input);
  if (!availability.orderable || availability.fulfillmentType !== "stocked") {
    return undefined;
  }

  const stockQuantity =
    typeof input.stockQuantity === "number" && Number.isFinite(input.stockQuantity)
      ? Math.max(0, Math.floor(input.stockQuantity))
      : 0;

  return stockQuantity > 0 ? stockQuantity : undefined;
}

export function applyAvailabilityToProduct<T extends ProductFulfillmentInput>(
  product: T,
): T & ProductAvailability & { maxCartQuantity?: number } {
  const availability = resolveProductAvailability(product);
  const maxCartQuantity = resolveMaxCartQuantity(product);

  return {
    ...product,
    ...availability,
    ...(maxCartQuantity !== undefined ? { maxCartQuantity } : {}),
  };
}

const ADMIN_FULFILLMENT_MODE_LABELS: Record<ProductFulfillmentType, string> = {
  made_to_order: "По поръчка",
  stocked: "Склад",
  unavailable: "Недостъпен",
};

export type AdminFulfillmentListInput = ProductFulfillmentInput;

export function getAdminFulfillmentModeLabel(
  fulfillmentType: ProductFulfillmentType | string | null | undefined,
): string {
  return ADMIN_FULFILLMENT_MODE_LABELS[normalizeFulfillmentType(fulfillmentType)];
}

export function formatAdminFulfillmentListStatus(
  input: AdminFulfillmentListInput,
): string {
  if (input.soldOut) {
    return "Изчерпан · ръчен стоп";
  }

  const fulfillmentType = normalizeFulfillmentType(input.fulfillmentType);
  const modeLabel = ADMIN_FULFILLMENT_MODE_LABELS[fulfillmentType];

  if (fulfillmentType === "stocked") {
    const stock =
      typeof input.stockQuantity === "number" && Number.isFinite(input.stockQuantity)
        ? Math.max(0, Math.floor(input.stockQuantity))
        : 0;
    return `${modeLabel} · ${stock} бр.`;
  }

  return modeLabel;
}
