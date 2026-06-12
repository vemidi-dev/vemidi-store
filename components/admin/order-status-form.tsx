"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

import { updateOrderStatus } from "@/app/admin/order-actions";
import {
  isOrderStatus,
  orderStatuses,
  orderStatusLabels,
  riskyOrderStatuses,
  type OrdersQuery,
} from "@/lib/admin/orders";
import { adminFieldClass } from "@/components/admin/styles";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Запази статус на поръчката"
      className="rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold uppercase tracking-wider text-boutique-ink disabled:opacity-50"
    >
      {pending ? "Запазване..." : "Запази"}
    </button>
  );
}

export function OrderStatusForm({
  orderId,
  currentStatus,
  query,
}: {
  orderId: string;
  currentStatus: string | null;
  query: OrdersQuery;
}) {
  const selectRef = useRef<HTMLSelectElement>(null);

  return (
    <form
      action={updateOrderStatus}
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        const nextStatus = selectRef.current?.value ?? "";
        if (
          isOrderStatus(nextStatus) &&
          riskyOrderStatuses.includes(nextStatus) &&
          !window.confirm(
            "Сигурни ли сте, че искате да откажете тази поръчка? Действието променя статуса, но не възстановява плащане или доставка автоматично.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={orderId} />
      <input type="hidden" name="return_status" value={query.status} />
      <input type="hidden" name="return_source" value={query.source} />
      <input type="hidden" name="return_q" value={query.search} />
      <input type="hidden" name="return_date_from" value={query.dateFrom} />
      <input type="hidden" name="return_date_to" value={query.dateTo} />
      <input type="hidden" name="return_payment" value={query.payment} />
      <input type="hidden" name="return_delivery" value={query.delivery} />
      <input type="hidden" name="return_sort" value={query.sort} />
      <input type="hidden" name="return_page" value={String(query.page)} />
      <input type="hidden" name="return_page_size" value={String(query.pageSize)} />

      <label className="min-w-44 text-xs font-medium text-boutique-ink">
        Статус
        <select
          ref={selectRef}
          name="status"
          defaultValue={currentStatus || "new"}
          className={adminFieldClass}
          aria-label="Нов статус на поръчката"
        >
          {orderStatuses.map((value) => (
            <option key={value} value={value}>
              {orderStatusLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton />
    </form>
  );
}
