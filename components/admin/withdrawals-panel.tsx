import {
  buildWithdrawalsListHref,
  formatWithdrawalDate,
  getWithdrawalClientLabel,
  withdrawalStatusLabels,
  type WithdrawalRequestRow,
  type WithdrawalsQuery,
} from "@/lib/admin/withdrawals";

import { WithdrawalStatusForm } from "./withdrawal-status-form";
import { adminFieldClass, adminPanelClass, adminTableHeadClass, adminTableRowClass } from "./styles";

type WithdrawalsPanelProps = {
  requests: WithdrawalRequestRow[];
  total: number;
  query: WithdrawalsQuery;
  error: { message: string } | null;
};

export function WithdrawalsPanel({
  requests,
  total,
  query,
  error,
}: WithdrawalsPanelProps) {
  return (
    <div className="space-y-5">
      <section className={adminPanelClass}>
        <div>
          <h2 className="font-heading text-2xl text-boutique-ink">Отказ от договор</h2>
          <p className="mt-2 text-sm text-boutique-muted">
            Заявления, подадени през публичната форма. Промяната на статус не
            извършва автоматично възстановяване на суми.
          </p>
        </div>

        <form className="mt-6 grid gap-3 md:grid-cols-3" method="get" action="/admin">
          <input type="hidden" name="tab" value="withdrawals" />
          <label className="text-sm font-medium text-boutique-ink">
            Търсене
            <input
              name="q"
              type="search"
              defaultValue={query.search}
              placeholder="Референция, име, поръчка, контакт"
              className={adminFieldClass}
            />
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Статус
            <select name="status" defaultValue={query.status} className={adminFieldClass}>
              <option value="">Всички</option>
              {Object.entries(withdrawalStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper"
            >
              Филтрирай
            </button>
          </div>
        </form>

        {error ? (
          <p className="mt-4 text-sm text-red-600">{error.message}</p>
        ) : null}

        <p className="mt-4 text-sm text-boutique-muted">
          Общо: {total}
        </p>

        <div className="mt-6 space-y-4 xl:hidden">
          {requests.map((request) => (
            <article
              key={request.id}
              className="rounded-xl border border-boutique-line bg-boutique-paper p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-boutique-ink">
                    {request.reference_number}
                  </p>
                  <p className="text-xs text-boutique-muted">
                    {formatWithdrawalDate(request.created_at)}
                  </p>
                </div>
                <span className="rounded-full border border-boutique-line px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {withdrawalStatusLabels[request.status as keyof typeof withdrawalStatusLabels] ?? request.status}
                </span>
              </div>
              <dl className="mt-3 space-y-1 text-sm text-boutique-muted">
                <div>
                  <dt className="inline font-medium text-boutique-ink">Клиент: </dt>
                  <dd className="inline">{getWithdrawalClientLabel(request)}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-boutique-ink">Поръчка: </dt>
                  <dd className="inline">{request.order_number_submitted}</dd>
                </div>
              </dl>
              <details className="mt-3 border-t border-boutique-line pt-3">
                <summary className="cursor-pointer text-xs font-semibold text-boutique-accent">
                  Детайли
                </summary>
                <WithdrawalDetails request={request} />
                <div className="mt-4 border-t border-boutique-line pt-4">
                  <WithdrawalStatusForm
                    currentStatus={request.status}
                    query={query}
                    requestId={request.id}
                  />
                </div>
              </details>
            </article>
          ))}
        </div>

        <div className="mt-6 hidden overflow-hidden rounded-xl border border-boutique-line xl:block">
          <table className="w-full text-left text-sm">
            <thead className={adminTableHeadClass}>
              <tr>
                <th className="px-4 py-3">Референция</th>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3">Клиент</th>
                <th className="px-4 py-3">Поръчка</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Детайли</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className={adminTableRowClass}>
                  <td className="px-4 py-3 font-medium text-boutique-ink">
                    {request.reference_number}
                  </td>
                  <td className="px-4 py-3 text-boutique-muted">
                    {formatWithdrawalDate(request.created_at)}
                  </td>
                  <td className="px-4 py-3">{getWithdrawalClientLabel(request)}</td>
                  <td className="px-4 py-3">{request.order_number_submitted}</td>
                  <td className="px-4 py-3">
                    {withdrawalStatusLabels[request.status as keyof typeof withdrawalStatusLabels] ?? request.status}
                  </td>
                  <td className="px-4 py-3">
                    <details>
                      <summary className="cursor-pointer text-boutique-accent">
                        Преглед
                      </summary>
                      <WithdrawalDetails request={request} />
                      <div className="mt-3">
                        <WithdrawalStatusForm
                          currentStatus={request.status}
                          query={query}
                          requestId={request.id}
                        />
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {requests.length === 0 ? (
          <p className="mt-6 text-sm text-boutique-muted">Няма намерени заявления.</p>
        ) : null}

        {total > query.pageSize ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {query.page > 1 ? (
              <a
                className="rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                href={buildWithdrawalsListHref({ ...query, page: query.page - 1 })}
              >
                Предишна
              </a>
            ) : null}
            {query.page * query.pageSize < total ? (
              <a
                className="rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                href={buildWithdrawalsListHref({ ...query, page: query.page + 1 })}
              >
                Следваща
              </a>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function WithdrawalDetails({ request }: { request: WithdrawalRequestRow }) {
  return (
    <dl className="mt-3 space-y-2 text-sm text-boutique-muted">
      <div>
        <dt className="font-medium text-boutique-ink">Имейл</dt>
        <dd>{request.contact_email || "—"}</dd>
      </div>
      <div>
        <dt className="font-medium text-boutique-ink">Телефон</dt>
        <dd>{request.contact_phone || "—"}</dd>
      </div>
      <div>
        <dt className="font-medium text-boutique-ink">Получено на</dt>
        <dd>{request.received_at}</dd>
      </div>
      <div>
        <dt className="font-medium text-boutique-ink">Артикули</dt>
        <dd className="whitespace-pre-wrap">{request.items_description}</dd>
      </div>
      {request.note ? (
        <div>
          <dt className="font-medium text-boutique-ink">Бележка</dt>
          <dd className="whitespace-pre-wrap">{request.note}</dd>
        </div>
      ) : null}
      {request.order_id ? (
        <div>
          <dt className="font-medium text-boutique-ink">Свързана поръчка (вътрешно)</dt>
          <dd className="font-mono text-xs">{request.order_id.slice(0, 8).toUpperCase()}</dd>
        </div>
      ) : null}
    </dl>
  );
}
