"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

import { updateWithdrawalStatus } from "@/app/admin/withdrawal-actions";
import {
  WITHDRAWAL_STATUSES,
  withdrawalStatusLabels,
  type WithdrawalsQuery,
} from "@/lib/admin/withdrawals";
import { adminFieldClass } from "@/components/admin/styles";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Запази статус на заявлението"
      className="rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold uppercase tracking-wider text-boutique-ink disabled:opacity-50"
    >
      {pending ? "Запазване..." : "Запази"}
    </button>
  );
}

export function WithdrawalStatusForm({
  requestId,
  currentStatus,
  query,
}: {
  requestId: string;
  currentStatus: string;
  query: WithdrawalsQuery;
}) {
  const selectRef = useRef<HTMLSelectElement>(null);

  return (
    <form action={updateWithdrawalStatus} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={requestId} />
      <input type="hidden" name="return_status" value={query.status} />
      <input type="hidden" name="return_q" value={query.search} />
      <input type="hidden" name="return_page" value={String(query.page)} />
      <input type="hidden" name="return_page_size" value={String(query.pageSize)} />

      <label className="min-w-44 text-xs font-medium text-boutique-ink">
        Статус
        <select
          ref={selectRef}
          name="status"
          defaultValue={currentStatus}
          className={adminFieldClass}
          aria-label="Нов статус на заявлението"
        >
          {WITHDRAWAL_STATUSES.map((value) => (
            <option key={value} value={value}>
              {withdrawalStatusLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton />
    </form>
  );
}
