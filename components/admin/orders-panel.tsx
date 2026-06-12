import { OrdersListView } from "@/components/admin/orders-list-view";
import {
  buildOrdersListHref,
  getOrderCounts,
  orderStatuses,
  orderStatusLabels,
  type OrderRow,
  type OrdersQuery,
} from "@/lib/admin/orders";

import { adminFieldClass, adminPanelClass } from "./styles";

type OrdersPanelProps = {
  orders: OrderRow[];
  total: number;
  query: OrdersQuery;
  counts: ReturnType<typeof getOrderCounts>;
  error: { message: string } | null;
};

export function OrdersPanel({
  orders,
  total,
  query,
  counts,
  error,
}: OrdersPanelProps) {
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
        </div>

        <form className="mt-6 grid gap-3 xl:grid-cols-4">
          <input type="hidden" name="tab" value="orders" />
          <label className="text-sm font-medium text-boutique-ink">
            Търсене
            <input
              name="q"
              type="search"
              defaultValue={query.search}
              placeholder="Номер, име, телефон, имейл"
              className={adminFieldClass}
            />
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Статус
            <select name="status" defaultValue={query.status} className={adminFieldClass}>
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
            <select name="source" defaultValue={query.source} className={adminFieldClass}>
              <option value="">Всички</option>
              <option value="store">Онлайн магазин</option>
              <option value="landing">Лендинг страница</option>
              <option value="unknown">Неуточнен</option>
            </select>
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Сортиране
            <select name="sort" defaultValue={query.sort} className={adminFieldClass}>
              <option value="date-desc">Дата (най-нови)</option>
              <option value="date-asc">Дата (най-стари)</option>
              <option value="total-desc">Сума (най-висока)</option>
              <option value="total-asc">Сума (най-ниска)</option>
            </select>
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            От дата
            <input
              name="date_from"
              type="date"
              defaultValue={query.dateFrom}
              className={adminFieldClass}
            />
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            До дата
            <input
              name="date_to"
              type="date"
              defaultValue={query.dateTo}
              className={adminFieldClass}
            />
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Плащане
            <select name="payment" defaultValue={query.payment} className={adminFieldClass}>
              <option value="">Всички</option>
              <option value="cash_on_delivery">Наложен платеж</option>
            </select>
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Доставка
            <select name="delivery" defaultValue={query.delivery} className={adminFieldClass}>
              <option value="">Всички</option>
              <option value="office">До офис</option>
              <option value="address">До адрес</option>
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2 xl:col-span-4">
            <button
              type="submit"
              className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper"
            >
              Филтрирай
            </button>
            <a
              href={buildOrdersListHref({
                ...query,
                status: "",
                search: "",
                source: "",
                dateFrom: "",
                dateTo: "",
                payment: "",
                delivery: "",
                sort: "date-desc",
                page: 1,
              })}
              className="rounded-full border border-boutique-line px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-ink"
            >
              Изчисти
            </a>
          </div>
        </form>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {[
            ["Всички", counts.total],
            ["Нови", counts.new],
            ["В обработка", counts.active],
            ["Завършени", counts.completed],
            ["Магазин", counts.store],
            ["Лендинг", counts.landing],
            ["Неуточнен", counts.unknown],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-boutique-line bg-boutique-bg p-3"
            >
              <p className="text-xs text-boutique-muted">{label}</p>
              <p className="mt-1 font-heading text-2xl text-boutique-ink">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Поръчките не могат да се заредят: {error.message}. Изпълнете SQL миграцията за достъп до
          поръчки.
        </div>
      ) : (
        <OrdersListView orders={orders} query={query} total={total} />
      )}
    </div>
  );
}
