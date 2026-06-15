"use client";

import { Fragment, useMemo, useState } from "react";

import { OrderDetailsSection } from "@/components/admin/order-details-section";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { OrdersExportPanel } from "@/components/admin/orders-export-panel";
import {
  adminTableHeadClass,
  adminTableRowClass,
} from "@/components/admin/styles";
import {
  buildOrdersListHref,
  formatOrderDate,
  formatOrderPrice,
  getDeliveryTypeLabel,
  getOrderItemCount,
  getOrderShortId,
  getOrderSourceLabel,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  type OrderRow,
  type OrdersQuery,
} from "@/lib/admin/orders";
import {
  getOrderNotificationBadgeClass,
  getOrderNotificationOverallLabel,
  type OrderNotificationSummary,
} from "@/lib/admin/order-notifications";

const SOURCE_BADGE: Record<string, string> = {
  store: "bg-boutique-sage-deep text-boutique-on-sage",
  landing: "border border-boutique-accent/30 bg-boutique-warm text-boutique-ink",
  unknown: "bg-boutique-bg text-boutique-muted",
};

function sourceBadgeClass(order: OrderRow) {
  const label = getOrderSourceLabel(order);
  if (label === "Онлайн магазин") return SOURCE_BADGE.store;
  if (label === "Лендинг страница") return SOURCE_BADGE.landing;
  return SOURCE_BADGE.unknown;
}

type OrdersListViewProps = {
  orders: OrderRow[];
  total: number;
  query: OrdersQuery;
  notificationSummaries?: Record<string, OrderNotificationSummary>;
};

export function OrdersListView({
  orders,
  total,
  query,
  notificationSummaries = {},
}: OrdersListViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const pageOrderIds = useMemo(() => orders.map((order) => order.id), [orders]);
  const allVisibleSelected =
    orders.length > 0 && orders.every((order) => selectedIds.includes(order.id));

  function toggleSelection(orderId: string) {
    setSelectedIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  }

  function toggleVisibleSelection() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !pageOrderIds.includes(id)));
      return;
    }

    setSelectedIds((current) => [...new Set([...current, ...pageOrderIds])]);
  }

  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

  if (orders.length === 0) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-boutique-line p-8 text-center text-sm text-boutique-muted">
        Няма поръчки, които отговарят на избраните филтри.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-boutique-muted">
          <span>
            Показани {orders.length} от {total} поръчки · страница {query.page} от {totalPages}
          </span>
          {selectedIds.length > 0 ? (
            <span className="rounded-full bg-boutique-sage-deep/10 px-2.5 py-1 font-semibold text-boutique-sage-deep">
              Избрани: {selectedIds.length}
            </span>
          ) : null}
        </div>
        <OrdersExportPanel
          pageOrderIds={pageOrderIds}
          query={query}
          selectedIds={selectedIds}
          total={total}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleVisibleSelection}
          className="rounded-full border border-boutique-line px-3 py-1.5 text-[11px] font-semibold text-boutique-ink"
        >
          {allVisibleSelected ? "Премахни избора на страницата" : "Избери показаните"}
        </button>
        {selectedIds.length > 0 ? (
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="rounded-full border border-boutique-line px-3 py-1.5 text-[11px] font-semibold text-boutique-muted"
          >
            Изчисти избора
          </button>
        ) : null}
      </div>

      <div className="space-y-3 xl:hidden">
        {orders.map((order) => {
          const detailsId = `order-details-${order.id}`;
          return (
            <article
              key={order.id}
              className="rounded-xl border border-boutique-line bg-white p-3"
            >
              <div className="flex items-start gap-2">
                <input
                  aria-label={`Избери поръчка ${getOrderShortId(order)}`}
                  checked={selectedIds.includes(order.id)}
                  className="mt-1"
                  type="checkbox"
                  onChange={() => toggleSelection(order.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-boutique-ink">
                      #{getOrderShortId(order)}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${sourceBadgeClass(order)}`}
                    >
                      {getOrderSourceLabel(order)}
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-boutique-ink">{order.customer_name}</p>
                  <p className="text-xs text-boutique-muted">
                    {formatOrderDate(order.created_at)} · {order.customer_phone}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-boutique-ink">
                    {formatOrderPrice(order.total_price, order.currency)}
                  </p>
                  <p className="text-xs text-boutique-muted">
                    {getOrderStatusLabel(order.status)} · {getOrderItemCount(order)} арт.
                  </p>
                  {notificationSummaries[order.id] ? (
                    <p className="mt-1">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getOrderNotificationBadgeClass(
                          notificationSummaries[order.id].admin === "failed" ||
                            notificationSummaries[order.id].customer === "failed"
                            ? "failed"
                            : notificationSummaries[order.id].admin === "pending" ||
                                notificationSummaries[order.id].customer === "pending"
                              ? "pending"
                              : "sent",
                        )}`}
                      >
                        Имейл: {getOrderNotificationOverallLabel(notificationSummaries[order.id])}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
              <details id={detailsId} className="mt-3 border-t border-boutique-line pt-3">
                <summary className="cursor-pointer text-xs font-semibold text-boutique-accent">
                  Детайли
                </summary>
                <div className="mt-3">
                  <OrderDetailsSection
                    order={order}
                    notificationSummary={notificationSummaries[order.id]}
                  />
                  <div className="mt-4 border-t border-boutique-line pt-4">
                    <OrderStatusForm
                      currentStatus={order.status}
                      orderId={order.id}
                      query={query}
                    />
                  </div>
                </div>
              </details>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-boutique-line xl:block">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[3%]" />
            <col className="w-[7%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[4%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
            <col className="w-[4%]" />
          </colgroup>
          <thead>
            <tr className={adminTableHeadClass}>
              <th className="px-2 py-2.5">
                <input
                  aria-label="Избери всички показани поръчки"
                  checked={allVisibleSelected}
                  type="checkbox"
                  onChange={toggleVisibleSelection}
                />
              </th>
              <th className="px-3 py-2.5 font-semibold">Номер</th>
              <th className="px-3 py-2.5 font-semibold">Дата</th>
              <th className="px-3 py-2.5 font-semibold">Статус</th>
              <th className="px-3 py-2.5 font-semibold">Имейл</th>
              <th className="px-3 py-2.5 font-semibold">Клиент</th>
              <th className="px-3 py-2.5 font-semibold">Телефон</th>
              <th className="px-3 py-2.5 font-semibold">Източник</th>
              <th className="px-3 py-2.5 font-semibold">Арт.</th>
              <th className="px-3 py-2.5 font-semibold">Сума</th>
              <th className="px-3 py-2.5 font-semibold">Плащане</th>
              <th className="px-3 py-2.5 font-semibold">Доставка</th>
              <th className="px-3 py-2.5 text-right font-semibold">Детайли</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const detailsId = `order-details-${order.id}`;
              const isExpanded = expandedOrderId === order.id;
              return (
                <Fragment key={order.id}>
                  <tr className={adminTableRowClass}>
                    <td className="px-2 py-2.5 align-top">
                      <input
                        aria-label={`Избери поръчка ${getOrderShortId(order)}`}
                        checked={selectedIds.includes(order.id)}
                        type="checkbox"
                        onChange={() => toggleSelection(order.id)}
                      />
                    </td>
                    <td className="break-all px-3 py-2.5 align-top font-mono text-xs text-boutique-ink">
                      {getOrderShortId(order)}
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs text-boutique-muted">
                      {formatOrderDate(order.created_at)}
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs">
                      {getOrderStatusLabel(order.status)}
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs">
                      {notificationSummaries[order.id] ? (
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getOrderNotificationBadgeClass(
                            notificationSummaries[order.id].admin === "failed" ||
                              notificationSummaries[order.id].customer === "failed"
                              ? "failed"
                              : notificationSummaries[order.id].admin === "pending" ||
                                  notificationSummaries[order.id].customer === "pending"
                                ? "pending"
                                : "sent",
                          )}`}
                        >
                          {getOrderNotificationOverallLabel(notificationSummaries[order.id])}
                        </span>
                      ) : (
                        <span className="text-boutique-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <p className="break-words font-medium text-boutique-ink">
                        {order.customer_name}
                      </p>
                      <p className="break-all text-xs text-boutique-muted">
                        {order.customer_email || "—"}
                      </p>
                    </td>
                    <td className="break-all px-3 py-2.5 align-top text-xs text-boutique-muted">
                      {order.customer_phone}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${sourceBadgeClass(order)}`}
                      >
                        {getOrderSourceLabel(order)}
                      </span>
                    </td>
                    <td className="break-words px-3 py-2.5 align-top text-xs text-boutique-muted">
                      {getOrderItemCount(order)}
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs font-semibold text-boutique-ink">
                      {formatOrderPrice(order.total_price, order.currency)}
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs text-boutique-muted">
                      {getPaymentMethodLabel(order.payment_method)}
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs text-boutique-muted">
                      {getDeliveryTypeLabel(order.delivery_type)}
                    </td>
                    <td className="px-2 py-2.5 align-top text-right">
                      <button
                        type="button"
                        aria-controls={detailsId}
                        aria-expanded={isExpanded}
                        className="text-xs font-semibold text-boutique-accent"
                        onClick={() =>
                          setExpandedOrderId((current) =>
                            current === order.id ? null : order.id,
                          )
                        }
                      >
                        {isExpanded ? "Затвори" : "Детайли"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr id={detailsId} className="border-b border-boutique-line bg-boutique-bg/60">
                      <td colSpan={13} className="p-4">
                        <div className="rounded-lg border border-boutique-line bg-white p-5 text-left">
                        <OrderDetailsSection
                          order={order}
                          notificationSummary={notificationSummaries[order.id]}
                        />
                        <div className="mt-4 border-t border-boutique-line pt-4">
                          <OrderStatusForm
                            currentStatus={order.status}
                            orderId={order.id}
                            query={query}
                          />
                        </div>
                      </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav
          aria-label="Странициране на поръчки"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <a
            aria-disabled={query.page <= 1}
            className={`rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold ${
              query.page <= 1 ? "pointer-events-none opacity-40" : "text-boutique-ink"
            }`}
            href={buildOrdersListHref(query, { page: Math.max(1, query.page - 1) })}
          >
            Предишна
          </a>
          <span className="text-xs text-boutique-muted">
            Страница {query.page} / {totalPages}
          </span>
          <a
            aria-disabled={query.page >= totalPages}
            className={`rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold ${
              query.page >= totalPages ? "pointer-events-none opacity-40" : "text-boutique-ink"
            }`}
            href={buildOrdersListHref(query, { page: Math.min(totalPages, query.page + 1) })}
          >
            Следваща
          </a>
        </nav>
      ) : null}
    </div>
  );
}
