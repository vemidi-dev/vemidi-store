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
};

export type OrdersResult = {
  orders: OrderRow[];
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

export async function loadOrders(
  supabase: SupabaseClient,
  status: string,
  search: string,
): Promise<OrdersResult> {
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false });

  if (isOrderStatus(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  const term = search.trim().toLocaleLowerCase("bg");
  const orders = ((data ?? []) as OrderRow[]).filter((order) => {
    if (!term) {
      return true;
    }

    return [order.customer_name, order.customer_phone, order.customer_email, order.child_name]
      .some((value) => String(value ?? "").toLocaleLowerCase("bg").includes(term));
  });

  return { orders, error };
}
