"use client";

import { useMemo, useState } from "react";

import {
  defaultOrderCsvColumns,
  orderCsvColumnLabels,
  orderCsvColumns,
  type OrderCsvColumn,
  type OrdersQuery,
} from "@/lib/admin/orders";

type ExportScope = "filtered" | "page" | "selected";

type OrdersExportPanelProps = {
  query: OrdersQuery;
  total: number;
  pageOrderIds: string[];
  selectedIds: string[];
};

export function OrdersExportPanel({
  query,
  total,
  pageOrderIds,
  selectedIds,
}: OrdersExportPanelProps) {
  const [scope, setScope] = useState<ExportScope>("filtered");
  const [columns, setColumns] = useState<OrderCsvColumn[]>([...defaultOrderCsvColumns]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();

    if (query.status) params.set("status", query.status);
    if (query.search) params.set("q", query.search);
    if (query.source) params.set("source", query.source);
    if (query.dateFrom) params.set("date_from", query.dateFrom);
    if (query.dateTo) params.set("date_to", query.dateTo);
    if (query.payment) params.set("payment", query.payment);
    if (query.delivery) params.set("delivery", query.delivery);
    if (query.sort) params.set("sort", query.sort);
    params.set("scope", scope);

    for (const column of columns) {
      params.append("columns", column);
    }

    if (scope === "selected") {
      for (const id of selectedIds) {
        params.append("ids", id);
      }
    } else if (scope === "page") {
      for (const id of pageOrderIds) {
        params.append("ids", id);
      }
    }

    return `/admin/orders/export?${params.toString()}`;
  }, [columns, pageOrderIds, query, scope, selectedIds]);

  const scopeLabel =
    scope === "filtered"
      ? `${total} поръчки по филтрите`
      : scope === "page"
        ? `${pageOrderIds.length} поръчки от страницата`
        : `${selectedIds.length} избрани поръчки`;

  const exportDisabled = scope === "selected" && selectedIds.length === 0;

  return (
    <details className="w-full rounded-xl border border-boutique-line bg-white lg:max-w-2xl">
      <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-boutique-sage-deep">
        CSV експорт
      </summary>
      <div className="space-y-4 border-t border-boutique-line p-4">
        <fieldset>
          <legend className="text-xs font-semibold text-boutique-ink">Обхват</legend>
          <div className="mt-2 space-y-2 text-xs text-boutique-ink">
            <label className="flex items-center gap-2">
              <input
                checked={scope === "filtered"}
                name="export-scope"
                type="radio"
                onChange={() => setScope("filtered")}
              />
              Всички резултати по активните филтри
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={scope === "page"}
                name="export-scope"
                type="radio"
                onChange={() => setScope("page")}
              />
              Само текущата страница
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={scope === "selected"}
                name="export-scope"
                type="radio"
                onChange={() => setScope("selected")}
              />
              Само избраните поръчки
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-semibold text-boutique-ink">Колони</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {orderCsvColumns.map((column) => (
              <label className="flex items-center gap-2 text-xs text-boutique-ink" key={column}>
                <input
                  checked={columns.includes(column)}
                  type="checkbox"
                  onChange={(event) => {
                    setColumns((current) => {
                      if (event.target.checked) {
                        return orderCsvColumns.filter(
                          (entry) => current.includes(entry) || entry === column,
                        );
                      }
                      return current.filter((entry) => entry !== column);
                    });
                  }}
                />
                {orderCsvColumnLabels[column]}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="text-xs text-boutique-muted">{scopeLabel}</p>

        <a
          aria-disabled={exportDisabled}
          className={`inline-flex rounded-lg bg-boutique-sage-deep px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-boutique-ink ${
            exportDisabled ? "pointer-events-none opacity-50" : ""
          }`}
          href={exportDisabled ? undefined : exportHref}
        >
          Изтегли CSV
        </a>
      </div>
    </details>
  );
}
