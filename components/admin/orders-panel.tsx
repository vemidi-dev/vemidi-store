import { updateOrderStatus } from "@/app/admin/order-actions";
import {
  formatOrderDate,
  formatOrderPrice,
  getOrderCounts,
  getOrderSource,
  getOrderSourceLabel,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  orderStatusLabels,
  orderStatuses,
  type OrderRow,
} from "@/lib/admin/orders";

import { adminFieldClass, adminPanelClass } from "./styles";

type OrdersPanelProps = {
  orders: OrderRow[];
  allOrders: OrderRow[];
  status: string;
  search: string;
  source: string;
  error: { message: string } | null;
};

function valueOrDash(value: string | null) {
  return value?.trim() || "—";
}

type StoreOrderItem = {
  name: string;
  unitPrice: number | null;
  quantity: number;
  personalization: string | null;
  selectedColors: Array<{
    fieldLabel?: string;
    optionName?: string;
  }>;
};

function getStoreOrderItems(order: OrderRow): StoreOrderItem[] {
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
      name: item.name,
      unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : null,
      quantity: item.quantity,
      personalization:
        typeof item.personalization === "string" ? item.personalization : null,
      selectedColors: Array.isArray(item.selectedColors)
        ? item.selectedColors.filter(
            (color): color is StoreOrderItem["selectedColors"][number] =>
              Boolean(color) && typeof color === "object",
          )
        : [],
    }];
  });
}

function StoreOrderItems({ order }: { order: OrderRow }) {
  const items = getStoreOrderItems(order);
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 border-t border-boutique-line pt-5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
        Артикули от магазина
      </h4>
      <div className="mt-3 space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className="rounded-xl bg-boutique-bg p-4 text-sm"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <p className="font-semibold text-boutique-ink">{item.name}</p>
              <p className="text-boutique-ink">
                {item.quantity} × {formatOrderPrice(item.unitPrice, order.currency)}
              </p>
            </div>
            {item.personalization ? (
              <p className="mt-2 whitespace-pre-line text-boutique-muted">
                Персонализация: {item.personalization}
              </p>
            ) : null}
            {item.selectedColors.map((color, colorIndex) => (
              <p key={colorIndex} className="mt-1 text-boutique-muted">
                {color.fieldLabel || "Цвят"}: {color.optionName || "—"}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderDetails({ order }: { order: OrderRow }) {
  const details = [
    ["Имейл", valueOrDash(order.customer_email)],
    ["Продукт", valueOrDash(order.kit_name || order.product_name)],
    ["Размер", valueOrDash(order.kit_size)],
    ["Оцветяване", valueOrDash(order.coloring)],
    ["Персонализация", order.personalization ? valueOrDash(order.child_name) : "Не"],
    ["Куриер", valueOrDash(order.courier)],
    ["Доставка", valueOrDash(order.delivery_type)],
    ["Град", valueOrDash(order.city)],
    ["Офис", valueOrDash(order.office_name)],
    ["Адрес на офис", valueOrDash(order.office_address)],
    ["Адрес / детайли", valueOrDash(order.delivery_details)],
    ["Плащане", getPaymentMethodLabel(order.payment_method)],
    ["Бележка", valueOrDash(order.note)],
  ];

  return (
    <>
      <StoreOrderItems order={order} />
      <dl className="mt-5 grid gap-3 border-t border-boutique-line pt-5 text-sm sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
              {label}
            </dt>
            <dd className="mt-1 break-words text-boutique-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export function OrdersPanel({
  orders,
  allOrders,
  status,
  search,
  source,
  error,
}: OrdersPanelProps) {
  const counts = getOrderCounts(allOrders);
  const exportParams = new URLSearchParams();
  if (status) exportParams.set("status", status);
  if (source) exportParams.set("source", source);
  if (search) exportParams.set("q", search);
  const exportHref = `/admin/orders/export${
    exportParams.size ? `?${exportParams.toString()}` : ""
  }`;

  return (
    <div className="space-y-5">
      <section className={adminPanelClass}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl text-boutique-ink">Поръчки</h2>
            <p className="mt-2 text-sm text-boutique-muted">
              Поръчките от магазина и лендинг страницата се зареждат от общата Supabase база.
            </p>
          </div>

          <form className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-[170px_180px_1fr_auto]">
            <input type="hidden" name="tab" value="orders" />
            <label className="text-sm font-medium text-boutique-ink">
              Статус
              <select name="status" defaultValue={status} className={adminFieldClass}>
                <option value="">Всички</option>
                {orderStatuses.map((value) => (
                  <option key={value} value={value}>
                    {orderStatusLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-boutique-ink">
              Източник
              <select name="source" defaultValue={source} className={adminFieldClass}>
                <option value="">Всички</option>
                <option value="store">Онлайн магазин</option>
                <option value="landing">Лендинг страница</option>
              </select>
            </label>
            <label className="text-sm font-medium text-boutique-ink">
              Търсене
              <input
                name="q"
                type="search"
                defaultValue={search}
                placeholder="Име, телефон, имейл"
                className={adminFieldClass}
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper"
            >
              Филтрирай
            </button>
          </form>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            ["Всички", counts.total],
            ["Нови", counts.new],
            ["В обработка", counts.active],
            ["Завършени", counts.completed],
            ["Магазин", counts.store],
            ["Лендинг", counts.landing],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-boutique-line bg-boutique-bg p-4"
            >
              <p className="text-xs text-boutique-muted">{label}</p>
              <p className="mt-2 font-heading text-2xl text-boutique-ink">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Поръчките не могат да се заредят: {error.message}. Изпълнете SQL миграцията за достъп до
          поръчки.
        </div>
      ) : null}

      {!error ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-boutique-muted">
            Показани {orders.length} от {counts.total} поръчки.
          </p>
          <a
            href={exportHref}
            className="rounded-lg bg-boutique-sage-deep px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-boutique-ink"
          >
            Експортирай показаните CSV
          </a>
        </div>
      ) : null}

      {!error && orders.length === 0 ? (
        <div className={adminPanelClass}>Няма поръчки, които отговарят на филтрите.</div>
      ) : null}

      {orders.map((order) => (
        <article key={order.id} className={adminPanelClass}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                  {formatOrderDate(order.created_at)}
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider ${
                    getOrderSource(order) === "store"
                      ? "bg-boutique-sage-deep text-boutique-on-sage"
                      : "border border-boutique-accent/30 bg-boutique-warm text-boutique-ink"
                  }`}
                >
                  {getOrderSourceLabel(order)}
                </span>
              </div>
              <h3 className="mt-2 font-heading text-xl text-boutique-ink">
                {order.customer_name}
              </h3>
              <p className="mt-1 text-sm text-boutique-muted">
                {order.customer_phone} · {valueOrDash(order.kit_name || order.product_name)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-boutique-ink">
                {formatOrderPrice(order.total_price, order.currency)}
              </p>
              <p className="mt-1 text-sm text-boutique-muted">
                {getOrderStatusLabel(order.status)}
              </p>
            </div>
          </div>

          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-semibold text-boutique-accent">
              Покажи детайли
            </summary>
            <OrderDetails order={order} />
          </details>

          <form action={updateOrderStatus} className="mt-5 flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="return_status" value={status} />
            <input type="hidden" name="return_source" value={source} />
            <input type="hidden" name="return_q" value={search} />
            <label className="min-w-52 text-sm font-medium text-boutique-ink">
              Промени статус
              <select
                name="status"
                defaultValue={order.status || "new"}
                className={adminFieldClass}
              >
                {orderStatuses.map((value) => (
                  <option key={value} value={value}>
                    {orderStatusLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-full border border-boutique-line px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-ink"
            >
              Запази
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}
