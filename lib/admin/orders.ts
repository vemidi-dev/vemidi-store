import type { SupabaseClient } from "@supabase/supabase-js";

import { getProductPath } from "@/lib/product-url";
import { isUuid } from "@/lib/is-uuid";

import type { ProductOptionSelectionSnapshot } from "@/lib/product-options";
import { formatOrderOptionLine, parseOrderOptionSelections } from "@/lib/order-option-display";

export const orderStatuses = [
  "new",
  "confirmed",
  "making",
  "shipped",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type OrderSourceFilter = "" | "store" | "landing" | "unknown";
export type OrderSourceKind = "store" | "landing" | "unknown";
export type OrderSortKey = "date-desc" | "date-asc" | "total-desc" | "total-asc";
export type OrderPaymentFilter = "" | "cash_on_delivery";
export type OrderDeliveryFilter = "" | "office" | "address";

export const ORDER_PAGE_SIZE_DEFAULT = 25;
export const ORDER_PAGE_SIZE_MAX = 100;

export const orderCsvColumns = [
  "order_number",
  "created_at",
  "status",
  "source",
  "customer_name",
  "customer_phone",
  "customer_email",
  "delivery_details",
  "office_name",
  "courier",
  "payment_method",
  "delivery_type",
  "products",
  "personalization",
  "total_price",
  "currency",
  "note",
] as const;

export type OrderCsvColumn = (typeof orderCsvColumns)[number];

export const orderCsvColumnLabels: Record<OrderCsvColumn, string> = {
  order_number: "Номер",
  created_at: "Дата",
  status: "Статус",
  source: "Източник",
  customer_name: "Име",
  customer_phone: "Телефон",
  customer_email: "Имейл",
  delivery_details: "Адрес / офис",
  office_name: "Офис",
  courier: "Куриер",
  payment_method: "Плащане",
  delivery_type: "Доставка",
  products: "Артикули",
  personalization: "Персонализация",
  total_price: "Сума",
  currency: "Валута",
  note: "Бележка",
};

export const defaultOrderCsvColumns: OrderCsvColumn[] = [
  "order_number",
  "created_at",
  "status",
  "source",
  "customer_name",
  "customer_phone",
  "customer_email",
  "products",
  "total_price",
  "currency",
];

export const orderStatusLabels: Record<OrderStatus, string> = {
  new: "Нова",
  confirmed: "Потвърдена",
  making: "Изработва се",
  shipped: "Изпратена",
  completed: "Завършена",
  cancelled: "Отказана",
};

export const riskyOrderStatuses: OrderStatus[] = ["cancelled"];

export type StoreOrderItem = {
  productId: string | null;
  productCode: string | null;
  productSlug: string | null;
  name: string;
  unitPrice: number | null;
  quantity: number;
  lineTotal: number | null;
  baseUnitPrice?: number | null;
  effectiveBasePrice?: number | null;
  optionDelta?: number | null;
  personalization: string | null;
  personalizationFields: Array<{ label?: string; value?: string }>;
  selectedColors: Array<{
    fieldId?: string;
    fieldLabel?: string;
    optionName?: string;
    quantity?: number;
  }>;
  optionSelections: ProductOptionSelectionSnapshot[];
};

export type OrderRow = {
  id: string;
  created_at: string | null;
  status: string | null;
  product_name: string | null;
  kit_name: string | null;
  kit_size: string | null;
  coloring: string | null;
  personalization: boolean | null;
  child_name: string | null;
  total_price: number | null;
  currency: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  courier: string | null;
  delivery_type: string | null;
  city: string | null;
  delivery_details: string | null;
  office_id: string | null;
  office_name: string | null;
  office_address: string | null;
  payment_method: string | null;
  note: string | null;
  raw_payload: {
    source?: string;
    order?: {
      items?: unknown[];
      totalPrice?: number;
      paymentMethod?: string;
    };
  } | null;
};

export type OrdersQuery = {
  status: string;
  search: string;
  orderId: string;
  source: string;
  dateFrom: string;
  dateTo: string;
  payment: string;
  delivery: string;
  sort: OrderSortKey;
  page: number;
  pageSize: number;
};

export type OrdersPageResult = {
  orders: OrderRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: ReturnType<typeof getOrderCounts>;
  error: { message: string } | null;
};

export function isOrderStatus(value: string): value is OrderStatus {
  return orderStatuses.includes(value as OrderStatus);
}

export function normalizeOrderStatus(value: string): OrderStatus | "" {
  return isOrderStatus(value) ? value : "";
}

export function normalizeOrderSourceFilter(value: string): OrderSourceFilter {
  return value === "store" || value === "landing" || value === "unknown" ? value : "";
}

export function normalizeOrderSource(value: string): "store" | "landing" | "" {
  const filter = normalizeOrderSourceFilter(value);
  return filter === "store" || filter === "landing" ? filter : "";
}

export function normalizeOrderSort(value: string): OrderSortKey {
  if (
    value === "date-asc" ||
    value === "total-desc" ||
    value === "total-asc"
  ) {
    return value;
  }
  return "date-desc";
}

export function normalizeOrderPaymentFilter(value: string): OrderPaymentFilter {
  return value === "cash_on_delivery" ? value : "";
}

export function normalizeOrderDeliveryFilter(value: string): OrderDeliveryFilter {
  return value === "office" || value === "address" ? value : "";
}

export function normalizeOrderPage(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export function normalizeOrderPageSize(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return ORDER_PAGE_SIZE_DEFAULT;
  }
  return Math.min(parsed, ORDER_PAGE_SIZE_MAX);
}

export function parseOrdersQuery(params: {
  status?: string;
  search?: string;
  orderId?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  payment?: string;
  delivery?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
}): OrdersQuery {
  const orderId = (params.orderId ?? "").trim();
  return {
    status: params.status ?? "",
    search: params.search ?? "",
    orderId: isUuid(orderId) ? orderId : "",
    source: params.source ?? "",
    dateFrom: params.dateFrom ?? "",
    dateTo: params.dateTo ?? "",
    payment: params.payment ?? "",
    delivery: params.delivery ?? "",
    sort: normalizeOrderSort(params.sort ?? ""),
    page: normalizeOrderPage(params.page ?? ""),
    pageSize: normalizeOrderPageSize(params.pageSize ?? ""),
  };
}

export function sanitizeOrderSearchTerm(value: string) {
  return value.trim().replace(/[%_,]/g, " ").replace(/\s+/g, " ").slice(0, 120);
}

/** Safe PostgREST search: never uses id.ilike on uuid columns. */
export function buildOrdersCustomerSearchOrFilter(search: string): string | null {
  const term = sanitizeOrderSearchTerm(search);
  if (!term) {
    return null;
  }

  const pattern = `%${term}%`;
  return `customer_name.ilike.${pattern},customer_phone.ilike.${pattern},customer_email.ilike.${pattern}`;
}

export function getOrderStatusLabel(status: string | null) {
  return isOrderStatus(status ?? "") ? orderStatusLabels[status as OrderStatus] : status || "Нова";
}

export function formatOrderDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Sofia",
  }).format(date);
}

export function formatOrderPrice(amount: number | null, currency: string | null) {
  if (amount === null || !Number.isFinite(Number(amount))) {
    return "—";
  }

  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: currency || "EUR",
  }).format(Number(amount));
}

export function getPaymentMethodLabel(value: string | null) {
  return value === "cash_on_delivery" ? "Наложен платеж" : value?.trim() || "—";
}

export function getCourierLabel(value: string | null) {
  if (value === "econt") return "Еконт";
  if (value === "speedy") return "Спиди";
  return value?.trim() || "—";
}

export function getDeliveryTypeLabel(value: string | null) {
  if (value === "office") return "До офис";
  if (value === "address") return "До адрес";
  return value?.trim() || "—";
}

export function getRawOrderSourceValue(order: OrderRow) {
  return order.raw_payload?.source?.trim() || "";
}

export function isLandingOnlyOrder(order: OrderRow) {
  return parseStoreOrderItems(order).length === 0 && isLegacyLandingOrder(order);
}

export function getLandingOrderColoringLabel(value: string | null) {
  if (value === "paints") return "Бои";
  if (value === "markers") return "Маркери";
  return value?.trim() || "—";
}

export function isLegacyLandingOrder(order: OrderRow) {
  return Boolean(order.kit_name || order.kit_size || order.coloring);
}

export function getOrderSourceKind(order: OrderRow): OrderSourceKind {
  const source = getRawOrderSourceValue(order);
  if (source === "vemidi-store") {
    return "store";
  }
  if (source === "vemidi-landing" || source === "landing" || source.startsWith("campaign-")) {
    return "landing";
  }
  if (!source) {
    return "unknown";
  }
  return "unknown";
}

export function getOrderSourceFilterValue(order: OrderRow): OrderSourceFilter {
  const source = getRawOrderSourceValue(order);
  if (source === "vemidi-store") {
    return "store";
  }
  if (source === "vemidi-landing" || source === "landing" || source.startsWith("campaign-")) {
    return "landing";
  }
  if (!source && isLegacyLandingOrder(order)) {
    return "landing";
  }
  if (!source) {
    return "unknown";
  }
  return "unknown";
}

export function getOrderSourceLabel(order: OrderRow) {
  const source = getRawOrderSourceValue(order);
  if (source === "vemidi-store") {
    return "Онлайн магазин";
  }
  if (source === "vemidi-landing" || source === "landing") {
    return "Лендинг страница";
  }
  if (source.startsWith("campaign-")) {
    return `Кампания (${source.slice("campaign-".length)})`;
  }
  if (!source) {
    return "Неуточнен";
  }
  return source;
}

/** @deprecated Use getOrderSourceKind or getOrderSourceFilterValue */
export function getOrderSource(order: OrderRow): "store" | "landing" {
  return getOrderSourceFilterValue(order) === "store" ? "store" : "landing";
}

export function getOrderShortId(order: Pick<OrderRow, "id">) {
  return order.id.slice(0, 8).toUpperCase();
}

export function getLegacyProductOrderCode(productId: string) {
  return `PRD-${productId.replaceAll("-", "").toUpperCase()}`;
}

export function getOrderItemProductCode(item: Pick<StoreOrderItem, "productCode" | "productId">) {
  if (item.productCode?.trim()) {
    return item.productCode.trim();
  }
  if (item.productId) {
    return getLegacyProductOrderCode(item.productId);
  }
  return null;
}

export function getOrderItemProductPath(item: Pick<StoreOrderItem, "productSlug" | "productId">) {
  if (item.productSlug?.trim()) {
    return getProductPath(item.productSlug.trim());
  }
  return null;
}

export function parseStoreOrderItems(order: OrderRow): StoreOrderItem[] {
  const items = order.raw_payload?.order?.items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((value) => {
    if (!value || typeof value !== "object") {
      return [];
    }

    const item = value as Record<string, unknown>;
    if (typeof item.name !== "string" || typeof item.quantity !== "number") {
      return [];
    }

    return [{
      productId:
        typeof item.productId === "string" && item.productId.trim()
          ? item.productId.trim()
          : null,
      productCode:
        typeof item.productCode === "string" && item.productCode.trim()
          ? item.productCode.trim()
          : null,
      productSlug:
        typeof item.productSlug === "string" && item.productSlug.trim()
          ? item.productSlug.trim()
          : null,
      name: item.name,
      unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : null,
      quantity: item.quantity,
      lineTotal: typeof item.lineTotal === "number" ? item.lineTotal : null,
      personalization:
        typeof item.personalization === "string" ? item.personalization : null,
      personalizationFields: Array.isArray(item.personalizationFields)
        ? item.personalizationFields.filter(
            (field): field is StoreOrderItem["personalizationFields"][number] =>
              Boolean(field) && typeof field === "object",
          )
        : [],
      selectedColors: Array.isArray(item.selectedColors)
        ? item.selectedColors.filter(
            (color): color is StoreOrderItem["selectedColors"][number] =>
              Boolean(color) && typeof color === "object",
          )
        : [],
      baseUnitPrice:
        typeof item.baseUnitPrice === "number" ? item.baseUnitPrice : null,
      effectiveBasePrice:
        typeof item.effectiveBasePrice === "number"
          ? item.effectiveBasePrice
          : null,
      optionDelta: typeof item.optionDelta === "number" ? item.optionDelta : null,
      optionSelections: parseOrderOptionSelections(item.optionSelections),
    }];
  });
}

export function getOrderItemCount(order: OrderRow) {
  const items = parseStoreOrderItems(order);
  if (items.length > 0) {
    return items.reduce((total, item) => total + item.quantity, 0);
  }
  return order.kit_name || order.product_name ? 1 : 0;
}

export function getOrderProductSummary(order: OrderRow) {
  const items = parseStoreOrderItems(order);
  if (items.length > 0) {
    return items.map((item) => `${item.quantity} × ${item.name}`).join("; ");
  }
  return order.kit_name || order.product_name || "";
}

export function getOrderPersonalizationSummary(order: OrderRow) {
  const itemTexts = parseStoreOrderItems(order).flatMap((item) => {
    const parts: string[] = [];
    if (item.personalization) {
      parts.push(item.personalization);
    }
    for (const field of item.personalizationFields) {
      if (field.label && field.value) {
        parts.push(`${field.label}: ${field.value}`);
      }
    }
    for (const group of item.optionSelections) {
      parts.push(formatOrderOptionLine(group));
    }
    return parts;
  });

  if (itemTexts.length > 0) {
    return itemTexts.join(" | ");
  }

  if (order.personalization && order.child_name) {
    return order.child_name;
  }

  return "";
}

function matchesSourceFilter(order: OrderRow, source: OrderSourceFilter) {
  if (!source) {
    return true;
  }
  return getOrderSourceFilterValue(order) === source;
}

export function filterOrders(
  orders: OrderRow[],
  {
    status,
    search,
    source,
    dateFrom = "",
    dateTo = "",
    payment = "",
    delivery = "",
  }: {
    status: string;
    search: string;
    source: string;
    dateFrom?: string;
    dateTo?: string;
    payment?: string;
    delivery?: string;
  },
) {
  const normalizedStatus = normalizeOrderStatus(status);
  const normalizedSource = normalizeOrderSourceFilter(source);
  const normalizedPayment = normalizeOrderPaymentFilter(payment);
  const normalizedDelivery = normalizeOrderDeliveryFilter(delivery);
  const term = sanitizeOrderSearchTerm(search).toLocaleLowerCase("bg");
  const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
  const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

  return orders.filter((order) => {
    if (normalizedStatus && (order.status || "new") !== normalizedStatus) {
      return false;
    }
    if (!matchesSourceFilter(order, normalizedSource)) {
      return false;
    }
    if (normalizedPayment && order.payment_method !== normalizedPayment) {
      return false;
    }
    if (normalizedDelivery && order.delivery_type !== normalizedDelivery) {
      return false;
    }

    if (fromTime || toTime) {
      const createdAt = order.created_at ? new Date(order.created_at).getTime() : NaN;
      if (Number.isNaN(createdAt)) {
        return false;
      }
      if (fromTime && createdAt < fromTime) {
        return false;
      }
      if (toTime && createdAt > toTime) {
        return false;
      }
    }

    if (!term) {
      return true;
    }

    return [
      order.id,
      getOrderShortId(order),
      order.customer_name,
      order.customer_phone,
      order.customer_email,
      order.child_name,
      order.kit_name,
      order.product_name,
      getOrderProductSummary(order),
    ].some((value) => String(value ?? "").toLocaleLowerCase("bg").includes(term));
  });
}

export function sortOrders(orders: OrderRow[], sort: OrderSortKey) {
  const sorted = [...orders];

  sorted.sort((left, right) => {
    if (sort === "total-desc" || sort === "total-asc") {
      const leftTotal = left.total_price ?? -1;
      const rightTotal = right.total_price ?? -1;
      return sort === "total-desc" ? rightTotal - leftTotal : leftTotal - rightTotal;
    }

    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    return sort === "date-asc" ? leftTime - rightTime : rightTime - leftTime;
  });

  return sorted;
}

export function paginateOrders<T>(items: T[], page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return items.slice(offset, offset + pageSize);
}

export function getOrderCounts(orders: OrderRow[]) {
  return {
    total: orders.length,
    new: orders.filter((order) => (order.status || "new") === "new").length,
    active: orders.filter((order) =>
      ["confirmed", "making", "shipped"].includes(order.status || ""),
    ).length,
    completed: orders.filter((order) => order.status === "completed").length,
    store: orders.filter((order) => getOrderSourceFilterValue(order) === "store").length,
    landing: orders.filter((order) => getOrderSourceFilterValue(order) === "landing").length,
    unknown: orders.filter((order) => getOrderSourceFilterValue(order) === "unknown").length,
  };
}

function escapeCsvCell(value: string) {
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function normalizeOrderCsvColumns(values: string[]) {
  const selected = new Set(
    values.filter((value): value is OrderCsvColumn =>
      orderCsvColumns.includes(value as OrderCsvColumn),
    ),
  );
  return selected.size
    ? orderCsvColumns.filter((column) => selected.has(column))
    : [...defaultOrderCsvColumns];
}

function getOrderCsvValue(order: OrderRow, column: OrderCsvColumn) {
  const values: Record<OrderCsvColumn, string> = {
    order_number: getOrderShortId(order),
    created_at: formatOrderDate(order.created_at),
    source: getOrderSourceLabel(order),
    status: getOrderStatusLabel(order.status),
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email || "",
    products: getOrderProductSummary(order),
    personalization: getOrderPersonalizationSummary(order),
    total_price:
      order.total_price === null ? "" : String(order.total_price).replace(".", ","),
    currency: order.currency || "EUR",
    courier: getCourierLabel(order.courier),
    delivery_type: getDeliveryTypeLabel(order.delivery_type),
    delivery_details: [order.city, order.delivery_details, order.office_address]
      .filter(Boolean)
      .join(", "),
    office_name: order.office_name || "",
    payment_method: getPaymentMethodLabel(order.payment_method),
    note: order.note || "",
  };
  return values[column];
}

export function buildOrdersCsv(
  orders: OrderRow[],
  columns: OrderCsvColumn[] = [...defaultOrderCsvColumns],
) {
  const selectedColumns = normalizeOrderCsvColumns(columns);
  const header = selectedColumns.map((column) => orderCsvColumnLabels[column]);
  const rows = orders.map((order) =>
    selectedColumns.map((column) => getOrderCsvValue(order, column)),
  );

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvCell(value)).join(","))
    .join("\r\n");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyServerFilters(query: any, {
    status,
    search,
    orderId,
    dateFrom,
    dateTo,
    payment,
    delivery,
    source,
  }: Pick<
    OrdersQuery,
    "status" | "search" | "orderId" | "dateFrom" | "dateTo" | "payment" | "delivery" | "source"
  >,
) {
  let next = query;

  const normalizedStatus = normalizeOrderStatus(status);
  if (normalizedStatus) {
    next = next.eq("status", normalizedStatus);
  }

  const normalizedPayment = normalizeOrderPaymentFilter(payment);
  if (normalizedPayment) {
    next = next.eq("payment_method", normalizedPayment);
  }

  const normalizedDelivery = normalizeOrderDeliveryFilter(delivery);
  if (normalizedDelivery) {
    next = next.eq("delivery_type", normalizedDelivery);
  }

  if (dateFrom) {
    next = next.gte("created_at", `${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    next = next.lte("created_at", `${dateTo}T23:59:59.999`);
  }

  const normalizedSource = normalizeOrderSourceFilter(source);
  if (normalizedSource === "store") {
    next = next.filter("raw_payload->>source", "eq", "vemidi-store");
  } else if (normalizedSource === "landing") {
    next = next.or(
      "raw_payload->>source.eq.vemidi-landing,raw_payload->>source.eq.landing,and(raw_payload->>source.is.null,kit_name.not.is.null)",
    );
  } else if (normalizedSource === "unknown") {
    next = next.or(
      "raw_payload.is.null,and(raw_payload->>source.is.null,kit_name.is.null,kit_size.is.null,coloring.is.null)",
    );
  }

  if (orderId && isUuid(orderId)) {
    next = next.eq("id", orderId);
  } else {
    const customerSearch = buildOrdersCustomerSearchOrFilter(search);
    if (customerSearch) {
      next = next.or(customerSearch);
    }
  }

  return next;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySort(query: any, sort: OrderSortKey) {
  if (sort === "date-asc") {
    return query.order("created_at", { ascending: true, nullsFirst: false });
  }
  if (sort === "total-desc") {
    return query.order("total_price", { ascending: false, nullsFirst: false });
  }
  if (sort === "total-asc") {
    return query.order("total_price", { ascending: true, nullsFirst: false });
  }
  return query.order("created_at", { ascending: false, nullsFirst: false });
}

export async function loadOrdersPage(
  supabase: SupabaseClient,
  query: OrdersQuery,
): Promise<OrdersPageResult> {
  const offset = (query.page - 1) * query.pageSize;
  let request = supabase.from("orders").select("*", { count: "exact" });
  request = applyServerFilters(request, query);
  request = applySort(request, query.sort);
  request = request.range(offset, offset + query.pageSize - 1);

  const [{ data, error, count }, countsResult] = await Promise.all([
    request,
    loadOrderSummaryCounts(supabase),
  ]);

  return {
    orders: (data ?? []) as OrderRow[],
    total: count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
    counts: countsResult,
    error: error ? { message: error.message } : null,
  };
}

export async function loadOrdersForExport(
  supabase: SupabaseClient,
  query: OrdersQuery,
  {
    scope,
    selectedIds = [],
    pageOrderIds = [],
  }: {
    scope: "filtered" | "page" | "selected";
    selectedIds?: string[];
    pageOrderIds?: string[];
  },
) {
  if (scope === "selected") {
    const uniqueIds = [...new Set(selectedIds.filter(Boolean))].slice(0, 500);
    if (uniqueIds.length === 0) {
      return [] as OrderRow[];
    }

    const { data, error } = await supabase.from("orders").select("*").in("id", uniqueIds);
    if (error) {
      throw new Error(error.message);
    }

    return sortOrders((data ?? []) as OrderRow[], query.sort);
  }

  if (scope === "page") {
    const uniqueIds = [...new Set(pageOrderIds.filter(Boolean))].slice(0, ORDER_PAGE_SIZE_MAX);
    if (uniqueIds.length === 0) {
      return [] as OrderRow[];
    }

    const { data, error } = await supabase.from("orders").select("*").in("id", uniqueIds);
    if (error) {
      throw new Error(error.message);
    }

    return sortOrders((data ?? []) as OrderRow[], query.sort);
  }

  let request = supabase.from("orders").select("*");
  request = applyServerFilters(request, query);
  request = applySort(request, query.sort);

  const { data, error } = await request;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OrderRow[];
}

export async function loadOrderSummaryCounts(supabase: SupabaseClient) {
  const [
    total,
    newCount,
    active,
    completed,
    store,
    landing,
    unknown,
  ] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["confirmed", "making", "shipped"]),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .filter("raw_payload->>source", "eq", "vemidi-store"),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .or(
        "raw_payload->>source.eq.vemidi-landing,raw_payload->>source.eq.landing,and(raw_payload->>source.is.null,kit_name.not.is.null)",
      ),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .or(
        "raw_payload.is.null,and(raw_payload->>source.is.null,kit_name.is.null,kit_size.is.null,coloring.is.null)",
      ),
  ]);

  return {
    total: total.count ?? 0,
    new: newCount.count ?? 0,
    active: active.count ?? 0,
    completed: completed.count ?? 0,
    store: store.count ?? 0,
    landing: landing.count ?? 0,
    unknown: unknown.count ?? 0,
  };
}

/** @deprecated Use loadOrdersPage */
export async function loadOrders(
  supabase: SupabaseClient,
  status: string,
  search: string,
  source: string,
): Promise<{
  orders: OrderRow[];
  allOrders: OrderRow[];
  error: { message: string } | null;
}> {
  const result = await loadOrdersPage(supabase, parseOrdersQuery({ status, search, source }));
  return {
    orders: result.orders,
    allOrders: [],
    error: result.error,
  };
}

export function buildOrdersListHref(query: OrdersQuery, overrides: Partial<OrdersQuery> = {}) {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams({ tab: "orders" });

  if (merged.status) params.set("status", merged.status);
  if (merged.search) params.set("q", merged.search);
  if (merged.orderId) params.set("order_id", merged.orderId);
  if (merged.source) params.set("source", merged.source);
  if (merged.dateFrom) params.set("date_from", merged.dateFrom);
  if (merged.dateTo) params.set("date_to", merged.dateTo);
  if (merged.payment) params.set("payment", merged.payment);
  if (merged.delivery) params.set("delivery", merged.delivery);
  if (merged.sort !== "date-desc") params.set("sort", merged.sort);
  if (merged.page > 1) params.set("page", String(merged.page));
  if (merged.pageSize !== ORDER_PAGE_SIZE_DEFAULT) {
    params.set("page_size", String(merged.pageSize));
  }

  return `/admin?${params.toString()}`;
}
