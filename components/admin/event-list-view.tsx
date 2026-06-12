"use client";

import { useMemo, useState } from "react";

import { deleteEvent, updateEvent } from "@/app/admin/content-actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import { AdminOpenDetailsButton } from "@/components/admin/admin-open-details-button";
import { ImageFileInput } from "@/components/admin/image-file-input";
import {
  adminFieldClass,
  adminHelperClass,
  adminTableHeadClass,
  adminTableRowClass,
} from "@/components/admin/styles";
import {
  eventHasCoverImage,
  filterEvents,
  formatEventLifecycleStatus,
  formatEventPeriod,
  getEventLifecycleStatus,
  sortEvents,
  type EventPeriodFilter,
  type EventPublishFilter,
  type EventSortKey,
} from "@/lib/event-admin";
import type { EventRow } from "@/lib/admin/types";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-boutique-bg text-boutique-muted",
  upcoming: "bg-sky-100 text-sky-800",
  active: "bg-emerald-100 text-emerald-800",
  ended: "bg-boutique-bg text-boutique-muted",
  "no-date": "bg-amber-50 text-amber-800",
};

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const PAGE_SIZE = 25;

export function EventListView({ events }: { events: EventRow[] }) {
  const [query, setQuery] = useState("");
  const [publishFilter, setPublishFilter] = useState<EventPublishFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<EventPeriodFilter>("all");
  const [sortKey, setSortKey] = useState<EventSortKey>("starts-desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleEvents = useMemo(() => {
    const filtered = filterEvents(events, {
      search: query,
      publish: publishFilter,
      period: periodFilter,
    });
    return sortEvents(filtered, sortKey);
  }, [events, periodFilter, publishFilter, query, sortKey]);

  const shownEvents = visibleEvents.slice(0, visibleCount);

  if (events.length === 0) {
    return (
      <p className="mt-5 text-sm text-boutique-muted">Все още няма добавени събития.</p>
    );
  }

  return (
    <div className="mt-6">
      <div className="rounded-xl border border-boutique-line bg-boutique-bg/70 p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Търсене
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="Заглавие или slug..."
              className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink outline-none focus:border-boutique-accent/50"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Публикация
            <select
              value={publishFilter}
              onChange={(event) => {
                setPublishFilter(event.target.value as EventPublishFilter);
                setVisibleCount(PAGE_SIZE);
              }}
              className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink"
            >
              <option value="all">Всички</option>
              <option value="published">Публикувани</option>
              <option value="draft">Чернови</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Период
            <select
              value={periodFilter}
              onChange={(event) => {
                setPeriodFilter(event.target.value as EventPeriodFilter);
                setVisibleCount(PAGE_SIZE);
              }}
              className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink"
            >
              <option value="all">Всички</option>
              <option value="upcoming">Предстоящи</option>
              <option value="active">Активни</option>
              <option value="ended">Приключили</option>
              <option value="no-date">Без дата</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Сортиране
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as EventSortKey)}
              className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink"
            >
              <option value="starts-desc">Начало (най-нови)</option>
              <option value="starts-asc">Начало (най-стари)</option>
              <option value="title-asc">Заглавие А–Я</option>
              <option value="title-desc">Заглавие Я–А</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setQuery("");
              setPublishFilter("all");
              setPeriodFilter("all");
              setSortKey("starts-desc");
              setVisibleCount(PAGE_SIZE);
            }}
            className="self-end rounded-full border border-boutique-line bg-white px-4 py-2.5 text-xs font-semibold text-boutique-ink hover:border-boutique-accent/40"
          >
            Изчисти
          </button>
        </div>

        <p className="mt-3 border-t border-boutique-line/70 pt-3 text-xs text-boutique-muted">
          Показани {shownEvents.length} от {visibleEvents.length} намерени
          {visibleEvents.length !== events.length ? ` · общо ${events.length}` : ""}
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-boutique-line">
        <table className="min-w-[52rem] w-full text-left text-sm">
          <thead>
            <tr className={adminTableHeadClass}>
              <th className="px-3 py-2.5 font-semibold">Заглавие</th>
              <th className="px-3 py-2.5 font-semibold">Период</th>
              <th className="px-3 py-2.5 font-semibold">Статус</th>
              <th className="px-3 py-2.5 font-semibold">Снимка</th>
              <th className="px-3 py-2.5 text-right font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            {shownEvents.map((event) => {
              const lifecycle = getEventLifecycleStatus(event);
              const detailsId = `event-edit-${event.id}`;

              return (
                <tr key={event.id} className={adminTableRowClass}>
                  <td className="px-3 py-2.5 align-top">
                    <p className="font-medium text-boutique-ink">{event.title}</p>
                    <p className="mt-0.5 text-xs text-boutique-muted">{event.slug}</p>
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs text-boutique-muted">
                    {formatEventPeriod(event.starts_at, event.ends_at)}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE[lifecycle] ?? STATUS_BADGE.draft}`}
                    >
                      {formatEventLifecycleStatus(lifecycle)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs text-boutique-muted">
                    {eventHasCoverImage(event) ? "1" : "0"}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <AdminOpenDetailsButton
                        detailsId={detailsId}
                        className="rounded-full border border-boutique-line px-3 py-1.5 text-[11px] font-semibold text-boutique-ink hover:border-boutique-accent/40"
                      >
                        Редактирай
                      </AdminOpenDetailsButton>
                      <AdminConfirmForm
                        action={deleteEvent}
                        confirmMessage={`Сигурни ли сте, че искате да изтриете „${event.title}"?`}
                        className="inline"
                      >
                        <input type="hidden" name="tab" value="events" />
                        <input type="hidden" name="id" value={event.id} />
                        <button
                          type="submit"
                          aria-label={`Изтрий събитие ${event.title}`}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                        >
                          Изтрий
                        </button>
                      </AdminConfirmForm>
                    </div>

                    <details id={detailsId} className="mt-3 rounded-lg border border-boutique-line bg-boutique-bg p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-boutique-ink">
                        Форма за редакция
                      </summary>
                      <form action={updateEvent} className="mt-4 grid gap-4 md:grid-cols-2">
                        <input type="hidden" name="tab" value="events" />
                        <input type="hidden" name="id" value={event.id} />
                        <input type="hidden" name="existing_image_url" value={event.image_url ?? ""} />
                        <label className="text-sm font-medium text-boutique-ink">
                          Заглавие
                          <input name="title" required defaultValue={event.title} className={adminFieldClass} />
                        </label>
                        <label className="text-sm font-medium text-boutique-ink">
                          Slug
                          <input name="slug" required defaultValue={event.slug} className={adminFieldClass} />
                        </label>
                        <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                          Кратко описание
                          <textarea name="excerpt" required rows={2} defaultValue={event.excerpt} className={`${adminFieldClass} resize-y`} />
                        </label>
                        <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                          Пълен текст
                          <textarea name="content" required rows={6} defaultValue={event.content} className={`${adminFieldClass} resize-y`} />
                        </label>
                        <label className="text-sm font-medium text-boutique-ink">Тип<input name="event_type" defaultValue={event.event_type ?? ""} className={adminFieldClass} /></label>
                        <label className="text-sm font-medium text-boutique-ink">Аудитория<input name="audience" defaultValue={event.audience ?? ""} className={adminFieldClass} /></label>
                        <label className="text-sm font-medium text-boutique-ink">
                          Формат
                          <select name="format" defaultValue={event.format ?? "in_person"} className={adminFieldClass}>
                            <option value="in_person">На място</option>
                            <option value="online">Онлайн</option>
                          </select>
                        </label>
                        <label className="text-sm font-medium text-boutique-ink">Цена<input name="price" type="number" step="0.01" defaultValue={event.price ?? ""} className={adminFieldClass} /></label>
                        <label className="text-sm font-medium text-boutique-ink">
                          Капацитет
                          <input name="capacity" type="number" min="1" defaultValue={event.capacity ?? ""} className={adminFieldClass} />
                        </label>
                        <label className="text-sm font-medium text-boutique-ink">
                          Свободни места
                          <input name="available_spots" type="number" min="0" max={event.capacity ?? undefined} defaultValue={event.available_spots ?? ""} className={adminFieldClass} />
                          <p className={adminHelperClass}>Полето се намалява автоматично при записване и се увеличава при отказ.</p>
                        </label>
                        <label className="text-sm font-medium text-boutique-ink">Възраст<input name="age_group" defaultValue={event.age_group ?? ""} className={adminFieldClass} /></label>
                        <label className="text-sm font-medium text-boutique-ink">Адрес<input name="address" defaultValue={event.address ?? ""} className={adminFieldClass} /></label>
                        <label className="text-sm font-medium text-boutique-ink">Продължителност<input name="duration_minutes" type="number" defaultValue={event.duration_minutes ?? ""} className={adminFieldClass} /></label>
                        <label className="text-sm font-medium text-boutique-ink">Водещ<input name="host_name" defaultValue={event.host_name ?? ""} className={adminFieldClass} /></label>
                        <label className="text-sm font-medium text-boutique-ink md:col-span-2">Включено<textarea name="includes_text" defaultValue={event.includes_text ?? ""} className={adminFieldClass} /></label>
                        <label className="text-sm font-medium text-boutique-ink md:col-span-2">Материали<textarea name="materials_text" defaultValue={event.materials_text ?? ""} className={adminFieldClass} /></label>
                        <label className="text-sm font-medium text-boutique-ink md:col-span-2">Отказ<textarea name="cancellation_policy" defaultValue={event.cancellation_policy ?? ""} className={adminFieldClass} /></label>
                        <label className="text-sm font-medium text-boutique-ink md:col-span-2">Линк за записване<input name="registration_url" type="url" defaultValue={event.registration_url ?? ""} className={adminFieldClass} /></label>
                        <label className="text-sm font-medium text-boutique-ink">
                          Място
                          <input name="location" defaultValue={event.location ?? ""} className={adminFieldClass} />
                        </label>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="text-sm font-medium text-boutique-ink">
                            Начало
                            <input name="starts_at" type="datetime-local" defaultValue={toDateTimeLocal(event.starts_at)} className={adminFieldClass} />
                          </label>
                          <label className="text-sm font-medium text-boutique-ink">
                            Край
                            <input name="ends_at" type="datetime-local" defaultValue={toDateTimeLocal(event.ends_at)} className={adminFieldClass} />
                          </label>
                        </div>
                        <ImageFileInput
                          name="image_file"
                          label="Нова снимка (по избор)"
                          className={adminFieldClass}
                          helperClassName={adminHelperClass}
                          helperText="Оставете празно, за да запазите текущата снимка."
                        />
                        <label className="inline-flex items-center gap-2 self-center text-sm text-boutique-ink">
                          <input name="is_published" type="checkbox" defaultChecked={event.is_published} className="h-4 w-4 accent-boutique-ink" />
                          Публикувано
                        </label>
                        <div className="md:col-span-2">
                          <button type="submit" className="rounded-full bg-boutique-ink px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper hover:bg-boutique-accent">
                            Запази промените
                          </button>
                        </div>
                      </form>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {shownEvents.length < visibleEvents.length ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
            className="rounded-full border border-boutique-sage-deep/30 px-5 py-2 text-xs font-semibold text-boutique-sage-deep"
          >
            Покажи още {Math.min(PAGE_SIZE, visibleEvents.length - shownEvents.length)}
          </button>
        </div>
      ) : null}

      {visibleEvents.length === 0 ? (
        <p className="mt-4 text-center text-sm text-boutique-muted">
          Няма събития, които отговарят на избраните филтри.
        </p>
      ) : null}
    </div>
  );
}
