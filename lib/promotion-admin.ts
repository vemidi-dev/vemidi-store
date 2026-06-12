import {
  calculateEffectivePrice,
  isPromotionActive,
  type ProductPromotionRow,
} from "@/lib/product-pricing";

export type PromotionLifecycleStatus =
  | "inactive"
  | "planned"
  | "active"
  | "ended";

export type PromotionPeriodInput = {
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export type PromotionProductOption = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  productCategoryIds: string[];
  occasionCategoryIds: string[];
  categorySummary: string;
  isSoldOut: boolean;
};

const STATUS_LABELS: Record<PromotionLifecycleStatus, string> = {
  inactive: "Неактивна",
  planned: "Планирана",
  active: "Активна",
  ended: "Приключила",
};

export function getPromotionLifecycleStatus(
  promotion: Pick<ProductPromotionRow, "is_active" | "starts_at" | "ends_at">,
  at: Date = new Date(),
): PromotionLifecycleStatus {
  if (!promotion.is_active) {
    return "inactive";
  }

  if (isPromotionActive(promotion, at)) {
    return "active";
  }

  if (new Date(promotion.starts_at).getTime() > at.getTime()) {
    return "planned";
  }

  return "ended";
}

export function formatPromotionLifecycleStatus(
  promotion: Pick<ProductPromotionRow, "is_active" | "starts_at" | "ends_at">,
  at?: Date,
): string {
  return STATUS_LABELS[getPromotionLifecycleStatus(promotion, at)];
}

export function isValidPercentageDiscount(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= 100;
}

export function isValidFixedDiscount(value: number, basePrice: number): boolean {
  if (!Number.isFinite(value) || value < 0) {
    return false;
  }

  return calculateEffectivePrice(basePrice, "fixed_price", value) < basePrice;
}

export function validatePromotionPeriod(
  startsAt: string,
  endsAt: string,
): string | null {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Въведете валидни начална и крайна дата.";
  }

  if (end.getTime() <= start.getTime()) {
    return "Крайната дата трябва да е след началната.";
  }

  return null;
}

export function promotionPeriodsOverlap(
  leftStart: string | Date,
  leftEnd: string | Date,
  rightStart: string | Date,
  rightEnd: string | Date,
): boolean {
  const leftStartMs = new Date(leftStart).getTime();
  const leftEndMs = new Date(leftEnd).getTime();
  const rightStartMs = new Date(rightStart).getTime();
  const rightEndMs = new Date(rightEnd).getTime();

  return leftStartMs < rightEndMs && rightStartMs < leftEndMs;
}

export function findOverlappingActivePromotions(
  productId: string,
  period: PromotionPeriodInput,
  promotions: ProductPromotionRow[],
  options?: {
    excludeCampaignId?: string | null;
    excludePromotionId?: string | null;
  },
): ProductPromotionRow[] {
  if (!period.isActive) {
    return [];
  }

  return promotions.filter((promotion) => {
    if (promotion.product_id !== productId || !promotion.is_active) {
      return false;
    }

    if (options?.excludeCampaignId && promotion.campaign_id === options.excludeCampaignId) {
      return false;
    }

    if (options?.excludePromotionId && promotion.id === options.excludePromotionId) {
      return false;
    }

    return promotionPeriodsOverlap(
      period.startsAt,
      period.endsAt,
      promotion.starts_at,
      promotion.ends_at,
    );
  });
}

export type CampaignProductIssue = {
  productId: string;
  productName: string;
  basePrice: number;
  effectivePrice: number;
  reason: "invalid_price" | "overlap";
  overlapWith?: string[];
};

export function analyzeCampaignSelection(input: {
  products: PromotionProductOption[];
  selectedIds: Iterable<string>;
  discountPercentage: number;
  period: PromotionPeriodInput;
  existingPromotions: ProductPromotionRow[];
}): {
  issues: CampaignProductIssue[];
  samplePrices: Array<{
    productId: string;
    productName: string;
    basePrice: number;
    effectivePrice: number;
  }>;
} {
  const selected = new Set(input.selectedIds);
  const issues: CampaignProductIssue[] = [];
  const samplePrices: Array<{
    productId: string;
    productName: string;
    basePrice: number;
    effectivePrice: number;
  }> = [];

  if (!isValidPercentageDiscount(input.discountPercentage)) {
    return { issues, samplePrices };
  }

  for (const product of input.products) {
    if (!selected.has(product.id)) {
      continue;
    }

    const effectivePrice = calculateEffectivePrice(
      product.price,
      "percentage",
      input.discountPercentage,
    );

    if (effectivePrice >= product.price) {
      issues.push({
        productId: product.id,
        productName: product.name,
        basePrice: product.price,
        effectivePrice,
        reason: "invalid_price",
      });
      continue;
    }

    const overlaps = findOverlappingActivePromotions(
      product.id,
      input.period,
      input.existingPromotions,
    );

    if (overlaps.length > 0) {
      issues.push({
        productId: product.id,
        productName: product.name,
        basePrice: product.price,
        effectivePrice,
        reason: "overlap",
        overlapWith: overlaps.map((promotion) => promotion.name),
      });
    }

    if (samplePrices.length < 3) {
      samplePrices.push({
        productId: product.id,
        productName: product.name,
        basePrice: product.price,
        effectivePrice,
      });
    }
  }

  return { issues, samplePrices };
}

export function buildPromotionProductOptions(
  products: Array<{
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    is_sold_out: boolean;
  }>,
  categories: Array<{
    id: string;
    name: string;
    category_type: "product" | "occasion";
  }>,
  productCategories: Array<{
    product_id: string;
    category_id: string;
  }>,
): PromotionProductOption[] {
  const categoryTypeById = new Map(
    categories.map((category) => [category.id, category.category_type]),
  );
  const categoryNameById = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const categoriesByProductId = new Map<string, string[]>();

  productCategories.forEach((row) => {
    const current = categoriesByProductId.get(row.product_id) ?? [];
    current.push(row.category_id);
    categoriesByProductId.set(row.product_id, current);
  });

  return products.map((product) => {
    const assigned = categoriesByProductId.get(product.id) ?? [];
    const productCategoryIds = assigned.filter(
      (categoryId) => categoryTypeById.get(categoryId) === "product",
    );
    const occasionCategoryIds = assigned.filter(
      (categoryId) => categoryTypeById.get(categoryId) === "occasion",
    );

    const categoryNames = assigned
      .map((categoryId) => categoryNameById.get(categoryId))
      .filter((name): name is string => Boolean(name));
    const categorySummary =
      categoryNames.length === 0
        ? ""
        : categoryNames.length <= 2
          ? categoryNames.join(", ")
          : `${categoryNames.slice(0, 2).join(", ")} +${categoryNames.length - 2}`;

    return {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.image_url,
      productCategoryIds,
      occasionCategoryIds,
      categorySummary,
      isSoldOut: Boolean(product.is_sold_out),
    };
  });
}

export function filterPromotionProducts(
  products: PromotionProductOption[],
  options: {
    query?: string;
    productCategoryId?: string;
    occasionCategoryId?: string;
    status?: "all" | "active" | "sold-out";
    excludeIds?: Set<string>;
    onlyIds?: Set<string>;
  },
): PromotionProductOption[] {
  const normalizedQuery = options.query?.trim().toLocaleLowerCase("bg") ?? "";

  return products.filter((product) => {
    if (options.onlyIds && !options.onlyIds.has(product.id)) {
      return false;
    }

    if (options.excludeIds?.has(product.id)) {
      return false;
    }

    if (
      normalizedQuery &&
      !product.name.toLocaleLowerCase("bg").includes(normalizedQuery)
    ) {
      return false;
    }

    if (
      options.productCategoryId &&
      options.productCategoryId !== "all" &&
      !product.productCategoryIds.includes(options.productCategoryId)
    ) {
      return false;
    }

    if (
      options.occasionCategoryId &&
      options.occasionCategoryId !== "all" &&
      !product.occasionCategoryIds.includes(options.occasionCategoryId)
    ) {
      return false;
    }

    if (options.status === "active" && product.isSoldOut) {
      return false;
    }

    if (options.status === "sold-out" && !product.isSoldOut) {
      return false;
    }

    return true;
  });
}
