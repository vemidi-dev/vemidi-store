import type { SupabaseClient } from "@supabase/supabase-js";

export const orderStatuses = [
  "new",
  "confirmed",
  "making",
  "shipped",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type OrderSource = "store" | "landing";

export const orderStatusLabels: Record<OrderStatus, string> = {
  new: "Нова",
  confirmed: "Потвърдена",
  making: "Изработва се",
  shipped: "Изпратена",
  completed: "Завършена",
  cancelled: "Отказана",
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
    };
  } | null;
};

export type OrdersResult = {
  orders: OrderRow[];
  allOrders: OrderRow[];
  error: { message: string } | null;
};

export function isOrderStatus(value: string): value is OrderStatus {
  return orderStatuses.includes(value as OrderStatus);
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
  return value === "cash_on_delivery" ? "Наложен платеж" : value || "—";
}

export function getOrderSource(order: OrderRow): OrderSource {
  return order.raw_payload?.source === "vemidi-store" ? "store" : "landing";
}

export function getOrderSourceLabel(order: OrderRow) {
  return getOrderSource(order) === "store" ? "Онлайн магазин" : "Лендинг страница";
}

export function normalizeOrderSource(value: string): OrderSource | "" {
  return value === "store" || value === "landing" ? value : "";
}

export function normalizeOrderStatus(value: string): OrderStatus | "" {
  return isOrderStatus(value) ? value : "";
}

export function filterOrders(
  orders: OrderRow[],
  {
    status,
    search,
    source,
  }: {
    status: string;
    search: string;
    source: string;
  },
) {
  const normalizedStatus = normalizeOrderStatus(status);
  const normalizedSource = normalizeOrderSource(source);
  const term = search.trim().toLocaleLowerCase("bg");

  return orders.filter((order) => {
    if (normalizedStatus && order.status !== normalizedStatus) {
      return false;
    }
    if (normalizedSource && getOrderSource(order) !== normalizedSource) {
      return false;
    }

    return (
      !term ||
      [
        order.customer_name,
        order.customer_phone,
        order.customer_email,
        order.child_name,
        order.kit_name,
        order.product_name,
        getOrderProductSummary(order),
      ].some((value) => String(value ?? "").toLocaleLowerCase("bg").includes(term))
    );
  });
}

export function getOrderCounts(orders: OrderRow[]) {
  return {
    total: orders.length,
    new: orders.filter((order) => (order.status || "new") === "new").length,
    active: orders.filter((order) =>
      ["confirmed", "making", "shipped"].includes(order.status || ""),
    ).length,
    completed: orders.filter((order) => order.status === "completed").length,
    store: orders.filter((order) => getOrderSource(order) === "store").length,
    landing: orders.filter((order) => getOrderSource(order) === "landing").length,
  };
}

function escapeCsvCell(value: string) {
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function getOrderProductSummary(order: OrderRow) {
  const items = order.raw_payload?.order?.items;
  if (Array.isArray(items)) {
    const names = items.flatMap((value) => {
      if (!value || typeof value !== "object") {
        return [];
      }
      const item = value as Record<string, unknown>;
      if (typeof item.name !== "string") {
        return [];
      }
      const quantity = typeof item.quantity === "number" ? item.quantity : 1;
      return [`${quantity} x ${item.name}`];
    });
    if (names.length) {
      return names.join("; ");
    }
  }
  return order.kit_name || order.product_name || "";
}

export function buildOrdersCsv(orders: OrderRow[]) {
  const header = [
    "created_at",
    "source",
    "status",
    "customer_name",
    "customer_phone",
    "customer_email",
    "products",
    "total_price",
    "currency",
    "courier",
    "delivery_type",
    "city",
    "delivery_details",
    "note",
  ];
  const rows = orders.map((order) => [
    order.created_at || "",
    getOrderSourceLabel(order),
    getOrderStatusLabel(order.status),
    order.customer_name,
    order.customer_phone,
    order.customer_email || "",
    getOrderProductSummary(order),
    order.total_price === null ? "" : String(order.total_price),
    order.currency || "EUR",
    order.courier || "",
    order.delivery_type || "",
    order.city || "",
    order.delivery_details || "",
    order.note || "",
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvCell(value)).join(","))
    .join("\r\n");
}

export async function loadOrders(
  supabase: SupabaseClient,
  status: string,
  search: string,
  source: string,
): Promise<OrdersResult> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  const allOrders = (data ?? []) as OrderRow[];
  const orders = filterOrders(allOrders, { status, search, source });

  return { orders, allOrders, error };
}
