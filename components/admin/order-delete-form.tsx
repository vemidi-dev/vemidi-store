"use client";

import { useFormStatus } from "react-dom";

import { deleteOrder } from "@/app/admin/order-actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import type { OrdersQuery } from "@/lib/admin/orders";

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:opacity-50"
    >
      {pending ? "Изтриване..." : "Изтрий поръчката"}
    </button>
  );
}

function ReturnQueryFields({ query }: { query: OrdersQuery }) {
  return (
    <>
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
    </>
  );
}

export function OrderDeleteForm({
  orderId,
  orderShortId,
  query,
}: {
  orderId: string;
  orderShortId: string;
  query: OrdersQuery;
}) {
  return (
    <AdminConfirmForm
      action={deleteOrder}
      confirmMessage={`Сигурни ли сте, че искате да изтриете поръчка #${orderShortId}? Действието е необратимо.`}
      className="mt-4 border-t border-boutique-line pt-4"
    >
      <input type="hidden" name="id" value={orderId} />
      <ReturnQueryFields query={query} />
      <p className="mb-3 text-xs leading-relaxed text-boutique-muted">
        Изтриването премахва поръчката и свързаните ѝ известия. Купони и заявки за отказ,
        свързани с нея, остават без връзка към поръчката.
      </p>
      <DeleteButton />
    </AdminConfirmForm>
  );
}
