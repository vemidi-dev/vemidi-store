"use client";

import { useMemo, useState } from "react";

import { updateSubscriber } from "@/app/admin/subscriber-actions";
import { AdminOpenDetailsButton } from "@/components/admin/admin-open-details-button";
import { SUBSCRIPTION_TOPICS } from "@/lib/admin/subscriptions";
import type { NewsletterSubscriberRow } from "@/lib/admin/types";
import { adminTableHeadClass, adminTableRowClass } from "@/components/admin/styles";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Sofia",
  }).format(new Date(value));
}

const PAGE_SIZE = 25;

export function SubscriberTableView({
  subscribers,
}: {
  subscribers: NewsletterSubscriberRow[];
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const shownSubscribers = useMemo(
    () => subscribers.slice(0, visibleCount),
    [subscribers, visibleCount],
  );

  if (subscribers.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-boutique-line p-8 text-center text-sm text-boutique-muted">
        Няма абонати, които отговарят на избраните филтри.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <p className="mb-3 text-xs text-boutique-muted">
        Показани {shownSubscribers.length} от {subscribers.length} записа
      </p>

      <div className="space-y-2 lg:hidden">
        {shownSubscribers.map((subscriber) => {
          const detailsId = `subscriber-edit-${subscriber.id}`;
          return (
            <article
              key={subscriber.id}
              className="rounded-xl border border-boutique-line bg-boutique-bg p-3"
            >
              <p className="break-all text-sm font-semibold text-boutique-ink">
                {subscriber.email}
              </p>
              <p className="mt-1 text-xs text-boutique-muted">
                {subscriber.is_active ? "Активен" : "Неактивен"} · {formatDate(subscriber.created_at)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {SUBSCRIPTION_TOPICS.filter((topic) => subscriber.topics.includes(topic.value)).map(
                  (topic) => (
                    <span
                      key={topic.value}
                      className="rounded-full bg-boutique-sage-deep/10 px-2 py-0.5 text-[10px] font-medium text-boutique-sage-deep"
                    >
                      {topic.shortLabel}
                    </span>
                  ),
                )}
              </div>
              <AdminOpenDetailsButton
                detailsId={detailsId}
                className="mt-3 rounded-full border border-boutique-line px-3 py-1.5 text-[11px] font-semibold text-boutique-ink"
              >
                Редактирай
              </AdminOpenDetailsButton>
              <details id={detailsId} className="mt-2">
                <summary className="sr-only">Редакция на абонат</summary>
                <SubscriberEditForm subscriber={subscriber} />
              </details>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-boutique-line lg:block">
        <table className="min-w-[52rem] w-full text-left text-sm">
          <thead>
            <tr className={adminTableHeadClass}>
              <th className="px-3 py-2.5 font-semibold">Имейл</th>
              <th className="px-3 py-2.5 font-semibold">Списъци</th>
              <th className="px-3 py-2.5 font-semibold">Статус</th>
              <th className="px-3 py-2.5 font-semibold">Добавен</th>
              <th className="px-3 py-2.5 text-right font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            {shownSubscribers.map((subscriber) => {
              const detailsId = `subscriber-edit-${subscriber.id}`;
              return (
                <tr key={subscriber.id} className={adminTableRowClass}>
                  <td className="px-3 py-2.5 align-top">
                    <p className="break-all font-medium text-boutique-ink">{subscriber.email}</p>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex flex-wrap gap-1">
                      {SUBSCRIPTION_TOPICS.filter((topic) =>
                        subscriber.topics.includes(topic.value),
                      ).map((topic) => (
                        <span
                          key={topic.value}
                          className="rounded-full bg-boutique-sage-deep/10 px-2 py-0.5 text-[10px] font-medium text-boutique-sage-deep"
                        >
                          {topic.shortLabel}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs">
                    <span
                      className={
                        subscriber.is_active
                          ? "text-emerald-700"
                          : "text-boutique-muted"
                      }
                    >
                      {subscriber.is_active ? "Активен" : "Неактивен"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs text-boutique-muted">
                    {formatDate(subscriber.created_at)}
                  </td>
                  <td className="px-3 py-2.5 align-top text-right">
                    <AdminOpenDetailsButton
                      detailsId={detailsId}
                      className="rounded-full border border-boutique-line px-3 py-1.5 text-[11px] font-semibold text-boutique-ink hover:border-boutique-accent/40"
                    >
                      Редактирай
                    </AdminOpenDetailsButton>
                    <details id={detailsId} className="mt-2 text-left">
                      <summary className="sr-only">Редакция на абонат</summary>
                      <SubscriberEditForm subscriber={subscriber} />
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {shownSubscribers.length < subscribers.length ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
            className="rounded-full border border-boutique-sage-deep/30 px-5 py-2 text-xs font-semibold text-boutique-sage-deep"
          >
            Покажи още {Math.min(PAGE_SIZE, subscribers.length - shownSubscribers.length)}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SubscriberEditForm({ subscriber }: { subscriber: NewsletterSubscriberRow }) {
  return (
    <form
      action={updateSubscriber}
      className="mt-2 grid gap-3 rounded-lg border border-boutique-line bg-boutique-paper p-3"
    >
      <input type="hidden" name="id" value={subscriber.id} />
      <p className="text-xs text-boutique-muted">
        Обновен: {formatDate(subscriber.updated_at)}
      </p>
      <fieldset>
        <legend className="text-xs font-semibold text-boutique-ink">Избрани списъци</legend>
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
        className="justify-self-start rounded-lg border border-boutique-sage-deep px-4 py-2 text-xs font-semibold text-boutique-sage-deep transition hover:bg-boutique-sage-deep hover:text-white"
      >
        Запази промените
      </button>
    </form>
  );
}
