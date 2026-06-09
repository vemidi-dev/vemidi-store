import { updateSubscriber } from "@/app/admin/subscriber-actions";
import {
  SUBSCRIPTION_TOPICS,
  getSubscriberCounts,
  type SubscriberStatusFilter,
  type SubscriberTopicFilter,
} from "@/lib/admin/subscriptions";
import type { NewsletterSubscriberRow } from "@/lib/admin/types";
import { adminPanelClass } from "@/components/admin/styles";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Sofia",
  }).format(new Date(value));
}

export function SubscriberManagementPanel({
  subscribers,
  allSubscribers,
  search,
  topic,
  status,
  error,
}: {
  subscribers: NewsletterSubscriberRow[];
  allSubscribers: NewsletterSubscriberRow[];
  search: string;
  topic: SubscriberTopicFilter;
  status: SubscriberStatusFilter;
  error: string | null;
}) {
  const counts = getSubscriberCounts(allSubscribers);
  const exportParams = new URLSearchParams();
  if (search) {
    exportParams.set("q", search);
  }
  if (topic !== "all") {
    exportParams.set("topic", topic);
  }
  const exportHref = `/admin/subscribers/export${
    exportParams.size ? `?${exportParams.toString()}` : ""
  }`;
  const cards = [
    ["Активни общо", counts.active],
    ["Нови продукти", counts.products],
    ["Блог", counts.blog],
    ["Работилници", counts.events],
  ] as const;

  return (
    <div className="space-y-6">
      <section className={adminPanelClass}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-accent">
            Аудитории
          </p>
          <h2 className="mt-2 font-heading text-3xl text-boutique-ink">
            Управление на абонаменти
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-boutique-muted">
            Всеки имейл се пази веднъж, а избраните теми определят в кои списъци
            участва. Неактивните абонати остават в историята, но не трябва да получават
            съобщения.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-boutique-line bg-boutique-bg p-4"
            >
              <p className="text-xs text-boutique-muted">{label}</p>
              <p className="mt-2 font-heading text-3xl text-boutique-ink">{value}</p>
            </div>
          ))}
        </div>

        <form className="mt-6 grid gap-3 md:grid-cols-[1fr_13rem_13rem_auto]">
          <input type="hidden" name="tab" value="subscribers" />
          <label className="text-xs font-semibold text-boutique-ink">
            Търсене по имейл
            <input
              name="subscriber_q"
              type="search"
              defaultValue={search}
              placeholder="email@example.com"
              className="mt-2 w-full rounded-lg border border-boutique-line bg-boutique-bg px-3 py-2.5 text-sm outline-none focus:border-boutique-accent/50"
            />
          </label>
          <label className="text-xs font-semibold text-boutique-ink">
            Списък
            <select
              name="subscriber_topic"
              defaultValue={topic}
              className="mt-2 w-full rounded-lg border border-boutique-line bg-boutique-bg px-3 py-2.5 text-sm outline-none"
            >
              <option value="all">Всички теми</option>
              {SUBSCRIPTION_TOPICS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-boutique-ink">
            Статус
            <select
              name="subscriber_status"
              defaultValue={status}
              className="mt-2 w-full rounded-lg border border-boutique-line bg-boutique-bg px-3 py-2.5 text-sm outline-none"
            >
              <option value="all">Всички</option>
              <option value="active">Активни</option>
              <option value="inactive">Неактивни</option>
            </select>
          </label>
          <button
            type="submit"
            className="self-end rounded-lg bg-boutique-ink px-5 py-2.5 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
          >
            Филтрирай
          </button>
        </form>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Абонаментите не могат да се заредят: {error}
        </p>
      ) : null}

      <section className={adminPanelClass}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl text-boutique-ink">Абонати</h2>
            <p className="mt-1 text-sm text-boutique-muted">
              Показани {subscribers.length} от {counts.total} записа.
            </p>
          </div>
          <a
            href={exportHref}
            className="rounded-lg bg-boutique-sage-deep px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-boutique-ink"
          >
            Експортирай активните CSV
          </a>
        </div>

        {subscribers.length ? (
          <div className="mt-6 space-y-3">
            {subscribers.map((subscriber) => (
              <form
                key={subscriber.id}
                action={updateSubscriber}
                className="grid gap-4 rounded-xl border border-boutique-line bg-boutique-bg p-4 lg:grid-cols-[minmax(15rem,1fr)_minmax(22rem,1.4fr)_auto]"
              >
                <input type="hidden" name="id" value={subscriber.id} />
                <div>
                  <p className="break-all text-sm font-semibold text-boutique-ink">
                    {subscriber.email}
                  </p>
                  <p className="mt-1 text-xs text-boutique-muted">
                    Добавен: {formatDate(subscriber.created_at)}
                  </p>
                  <p className="mt-1 text-xs text-boutique-muted">
                    Обновен: {formatDate(subscriber.updated_at)}
                  </p>
                </div>

                <fieldset>
                  <legend className="text-xs font-semibold text-boutique-ink">
                    Избрани списъци
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {SUBSCRIPTION_TOPICS.map((item) => (
                      <label
                        key={item.value}
                        className="flex items-center gap-2 text-xs text-boutique-muted"
                      >
                        <input
                          type="checkbox"
                          name="topics"
                          value={item.value}
                          defaultChecked={subscriber.topics.includes(item.value)}
                          className="accent-boutique-rose-deep"
                        />
                        {item.shortLabel}
                      </label>
                    ))}
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-boutique-ink">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={subscriber.is_active}
                      className="accent-boutique-sage-deep"
                    />
                    Активен абонамент
                  </label>
                </fieldset>

                <button
                  type="submit"
                  className="self-center rounded-lg border border-boutique-sage-deep px-4 py-2.5 text-xs font-semibold text-boutique-sage-deep transition hover:bg-boutique-sage-deep hover:text-white"
                >
                  Запази
                </button>
              </form>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-dashed border-boutique-line p-8 text-center text-sm text-boutique-muted">
            Няма абонати, които отговарят на избраните филтри.
          </p>
        )}
      </section>
    </div>
  );
}
