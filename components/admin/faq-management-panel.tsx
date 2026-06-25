"use client";

import { useMemo, useState } from "react";

import {
  addFaqItemToGroup,
  createFaqGroup,
  createFaqItem,
  deleteFaqItem,
  moveFaqGroup,
  moveFaqGroupItem,
  removeFaqItemFromGroup,
  updateFaqGroup,
  updateFaqItem,
} from "@/app/admin/faq-actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import { AdminSectionAccordion } from "@/components/admin/admin-section-accordion";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
  adminTableHeadClass,
  adminTableRowClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type {
  FaqGroupItemRow,
  FaqGroupRow,
  FaqItemRow,
} from "@/lib/faq/types";

type FaqScopeFilter = "global" | "product";

type FaqManagementPanelProps = {
  groups: FaqGroupRow[];
  items: FaqItemRow[];
  groupItems: FaqGroupItemRow[];
};

function scopeLabel(scope: FaqScopeFilter) {
  return scope === "global" ? "Глобални" : "За продукти";
}

function activeBadge(isActive: boolean) {
  return isActive ? (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
      Активна
    </span>
  ) : (
    <span className="rounded-full bg-boutique-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-muted">
      Скрита
    </span>
  );
}

export function FaqManagementPanel({
  groups,
  items,
  groupItems,
}: FaqManagementPanelProps) {
  const [scopeFilter, setScopeFilter] = useState<FaqScopeFilter>("global");
  const [itemQuery, setItemQuery] = useState("");

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const groupUsageByItemId = useMemo(() => {
    const map = new Map<string, number>();
    groupItems.forEach((link) => {
      map.set(link.faq_item_id, (map.get(link.faq_item_id) ?? 0) + 1);
    });
    return map;
  }, [groupItems]);

  const scopedGroups = useMemo(
    () =>
      [...groups]
        .filter((group) => group.scope === scopeFilter)
        .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, "bg")),
    [groups, scopeFilter],
  );

  const groupItemsByGroupId = useMemo(() => {
    const map = new Map<string, FaqGroupItemRow[]>();
    groupItems.forEach((link) => {
      const rows = map.get(link.group_id) ?? [];
      rows.push(link);
      map.set(link.group_id, rows);
    });
    map.forEach((rows, groupId) => {
      map.set(
        groupId,
        [...rows].sort(
          (left, right) =>
            left.sort_order - right.sort_order ||
            String(left.faq_item_id).localeCompare(String(right.faq_item_id)),
        ),
      );
    });
    return map;
  }, [groupItems]);

  const filteredItems = useMemo(() => {
    const query = itemQuery.trim().toLowerCase();
    const sorted = [...items].sort(
      (left, right) =>
        left.sort_order - right.sort_order ||
        left.question.localeCompare(right.question, "bg"),
    );
    if (!query) {
      return sorted;
    }
    return sorted.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query),
    );
  }, [itemQuery, items]);

  return (
    <div className="space-y-6">
      <article className={`${adminPanelClass} !p-5 md:!p-6`}>
        <h2 className="font-heading text-xl text-boutique-ink">Въпроси и отговори</h2>
        <p className="mt-1 text-xs leading-relaxed text-boutique-muted">
          Централна библиотека с reusable въпроси. Глобалните групи не могат да се свързват
          директно с продукт — използвайте продуктови групи или индивидуални асоциации.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["global", "product"] as const).map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => setScopeFilter(scope)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                scopeFilter === scope
                  ? "border-boutique-ink bg-boutique-ink text-white"
                  : "border-boutique-line bg-white text-boutique-ink hover:border-boutique-accent/40"
              }`}
            >
              {scopeLabel(scope)} (
              {groups.filter((group) => group.scope === scope).length})
            </button>
          ))}
        </div>

        <AdminSectionAccordion
          title={`Добавяне на ${scopeLabel(scopeFilter).toLowerCase()} група`}
          countLabel="свиване / разгъване"
          className="mt-4"
        >
          <form action={createFaqGroup} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name={adminFormFields.faq.groupScope} value={scopeFilter} />
            <label className="text-xs font-medium text-boutique-ink md:col-span-2">
              Име
              <input
                name={adminFormFields.faq.groupName}
                required
                className={`${adminFieldClass} !mt-1`}
                placeholder="Напр. Доставка и поръчка"
              />
            </label>
            <label className="text-xs font-medium text-boutique-ink">
              Slug
              <input
                name={adminFormFields.faq.groupSlug}
                className={`${adminFieldClass} !mt-1`}
                placeholder="dostavka-i-porachka"
              />
              <span className={adminHelperClass}>Оставете празно за автоматична нормализация от името.</span>
            </label>
            <label className="text-xs font-medium text-boutique-ink">
              Подредба
              <input
                name={adminFormFields.faq.groupSortOrder}
                type="number"
                min="0"
                step="1"
                defaultValue="0"
                className={`${adminFieldClass} !mt-1`}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-boutique-ink md:col-span-2">
              <input
                type="checkbox"
                name={adminFormFields.faq.groupIsActive}
                defaultChecked
                className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
              />
              Активна група
            </label>
            <div className="md:col-span-2 flex justify-end border-t border-boutique-line/60 pt-3">
              <button className="rounded-full bg-boutique-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-boutique-accent">
                Добави група
              </button>
            </div>
          </form>
        </AdminSectionAccordion>
      </article>

      {scopedGroups.length === 0 ? (
        <p className="text-sm text-boutique-muted">
          Няма {scopeLabel(scopeFilter).toLowerCase()} групи. Добавете първата от формата по-горе.
        </p>
      ) : (
        <div className="space-y-3">
          {scopedGroups.map((group) => {
            const links = groupItemsByGroupId.get(group.id) ?? [];
            const linkedItems = links
              .map((link) => itemById.get(link.faq_item_id))
              .filter((item): item is FaqItemRow => Boolean(item));

            return (
              <AdminSectionAccordion
                key={group.id}
                title={group.name}
                countLabel={`${linkedItems.length} въпроса`}
                trailing={
                  <span className="flex items-center gap-2">
                    {activeBadge(group.is_active)}
                    <span className="text-[10px] text-boutique-muted">{group.slug}</span>
                  </span>
                }
              >
                <div className="space-y-4">
                  <form action={updateFaqGroup} className="grid gap-3 md:grid-cols-2">
                    <input type="hidden" name={adminFormFields.common.id} value={group.id} />
                    <input type="hidden" name={adminFormFields.faq.groupScope} value={group.scope} />
                    <label className="text-xs font-medium text-boutique-ink md:col-span-2">
                      Име
                      <input
                        name={adminFormFields.faq.groupName}
                        required
                        defaultValue={group.name}
                        className={`${adminFieldClass} !mt-1`}
                      />
                    </label>
                    <label className="text-xs font-medium text-boutique-ink">
                      Slug
                      <input
                        name={adminFormFields.faq.groupSlug}
                        required
                        defaultValue={group.slug}
                        className={`${adminFieldClass} !mt-1`}
                      />
                    </label>
                    <label className="text-xs font-medium text-boutique-ink">
                      Подредба
                      <input
                        name={adminFormFields.faq.groupSortOrder}
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={group.sort_order}
                        className={`${adminFieldClass} !mt-1`}
                      />
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-boutique-ink md:col-span-2">
                      <input
                        type="checkbox"
                        name={adminFormFields.faq.groupIsActive}
                        defaultChecked={group.is_active}
                        className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                      />
                      Активна група
                    </label>
                    <div className="md:col-span-2">
                      <button className="rounded-full bg-boutique-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
                        Запази група
                      </button>
                    </div>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    <form action={moveFaqGroup}>
                      <input type="hidden" name={adminFormFields.common.id} value={group.id} />
                      <input type="hidden" name={adminFormFields.faq.direction} value="up" />
                      <button className="rounded-full border border-boutique-line px-3 py-1.5 text-xs font-medium text-boutique-ink">
                        Премести група нагоре
                      </button>
                    </form>
                    <form action={moveFaqGroup}>
                      <input type="hidden" name={adminFormFields.common.id} value={group.id} />
                      <input type="hidden" name={adminFormFields.faq.direction} value="down" />
                      <button className="rounded-full border border-boutique-line px-3 py-1.5 text-xs font-medium text-boutique-ink">
                        Премести група надолу
                      </button>
                    </form>
                  </div>

                  <div className="rounded-lg border border-boutique-line/70 bg-boutique-bg/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
                      Въпроси в групата
                    </p>
                    {linkedItems.length === 0 ? (
                      <p className="mt-2 text-sm text-boutique-muted">Групата все още няма въпроси.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {linkedItems.map((item, index) => (
                          <li
                            key={item.id}
                            className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-boutique-line bg-white p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-boutique-ink">{item.question}</p>
                              <p className="mt-1 line-clamp-2 text-xs text-boutique-muted">{item.answer}</p>
                              {!item.is_active ? (
                                <span className="mt-1 inline-block text-[10px] font-medium text-amber-700">
                                  Скрит въпрос
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <form action={moveFaqGroupItem}>
                                <input type="hidden" name={adminFormFields.faq.groupId} value={group.id} />
                                <input type="hidden" name={adminFormFields.faq.itemId} value={item.id} />
                                <input type="hidden" name={adminFormFields.faq.direction} value="up" />
                                <button
                                  type="submit"
                                  disabled={index === 0}
                                  className="rounded border border-boutique-line px-2 py-1 text-[10px] font-medium disabled:opacity-40"
                                >
                                  ↑
                                </button>
                              </form>
                              <form action={moveFaqGroupItem}>
                                <input type="hidden" name={adminFormFields.faq.groupId} value={group.id} />
                                <input type="hidden" name={adminFormFields.faq.itemId} value={item.id} />
                                <input type="hidden" name={adminFormFields.faq.direction} value="down" />
                                <button
                                  type="submit"
                                  disabled={index === linkedItems.length - 1}
                                  className="rounded border border-boutique-line px-2 py-1 text-[10px] font-medium disabled:opacity-40"
                                >
                                  ↓
                                </button>
                              </form>
                              <form action={removeFaqItemFromGroup}>
                                <input type="hidden" name={adminFormFields.faq.groupId} value={group.id} />
                                <input type="hidden" name={adminFormFields.faq.itemId} value={item.id} />
                                <button className="rounded border border-red-200 px-2 py-1 text-[10px] font-medium text-red-700">
                                  Премахни
                                </button>
                              </form>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <form action={addFaqItemToGroup} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <input type="hidden" name={adminFormFields.faq.groupId} value={group.id} />
                      <label className="flex-1 text-xs font-medium text-boutique-ink">
                        Добави съществуващ въпрос
                        <select
                          name={adminFormFields.faq.itemId}
                          required
                          className={`${adminFieldClass} !mt-1`}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Изберете въпрос...
                          </option>
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.question}
                              {!item.is_active ? " (скрит)" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-boutique-ink">
                        Добави към групата
                      </button>
                    </form>
                  </div>
                </div>
              </AdminSectionAccordion>
            );
          })}
        </div>
      )}

      <article className={`${adminPanelClass} !p-5 md:!p-6`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-heading text-lg text-boutique-ink">Библиотека с въпроси</h3>
          <span className="text-xs text-boutique-muted">{items.length} общо</span>
        </div>

        <AdminSectionAccordion title="Добавяне на въпрос" countLabel="свиване / разгъване" className="mt-4">
          <form action={createFaqItem} className="grid gap-3">
            <label className="text-xs font-medium text-boutique-ink">
              Въпрос
              <input
                name={adminFormFields.faq.itemQuestion}
                required
                className={`${adminFieldClass} !mt-1`}
              />
            </label>
            <label className="text-xs font-medium text-boutique-ink">
              Отговор
              <textarea
                name={adminFormFields.faq.itemAnswer}
                required
                rows={4}
                className={`${adminFieldClass} !mt-1 resize-y`}
              />
            </label>
            <label className="text-xs font-medium text-boutique-ink">
              Подредба
              <input
                name={adminFormFields.faq.itemSortOrder}
                type="number"
                min="0"
                step="1"
                defaultValue="0"
                className={`${adminFieldClass} !mt-1`}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-boutique-ink">
              <input
                type="checkbox"
                name={adminFormFields.faq.itemIsActive}
                defaultChecked
                className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
              />
              Активен въпрос
            </label>
            <div className="flex justify-end border-t border-boutique-line/60 pt-3">
              <button className="rounded-full bg-boutique-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
                Добави въпрос
              </button>
            </div>
          </form>
        </AdminSectionAccordion>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          Търсене
          <input
            type="search"
            value={itemQuery}
            onChange={(event) => setItemQuery(event.target.value)}
            placeholder="Въпрос или отговор..."
            className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink"
          />
        </label>

        {filteredItems.length === 0 ? (
          <p className="mt-4 text-sm text-boutique-muted">Няма намерени въпроси.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-boutique-line">
            <table className="min-w-full text-left text-sm">
              <thead className={adminTableHeadClass}>
                <tr>
                  <th className="px-3 py-2">Въпрос</th>
                  <th className="px-3 py-2">Групи</th>
                  <th className="px-3 py-2">Статус</th>
                  <th className="px-3 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const usageCount = groupUsageByItemId.get(item.id) ?? 0;
                  const deleteMessage =
                    usageCount > 0
                      ? `Въпросът се използва в ${usageCount} групи. Сигурни ли сте, че искате да го изтриете?`
                      : "Сигурни ли сте, че искате да изтриете този въпрос?";

                  return (
                    <tr key={item.id} className={adminTableRowClass}>
                      <td className="px-3 py-3 align-top">
                        <details>
                          <summary className="cursor-pointer font-medium text-boutique-ink">
                            {item.question}
                          </summary>
                          <p className="mt-2 whitespace-pre-line text-xs text-boutique-muted">
                            {item.answer}
                          </p>
                        </details>
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-boutique-muted">
                        {usageCount === 0 ? "—" : `${usageCount} групи`}
                      </td>
                      <td className="px-3 py-3 align-top">{activeBadge(item.is_active)}</td>
                      <td className="px-3 py-3 align-top">
                        <details className="text-right">
                          <summary className="cursor-pointer text-xs font-semibold text-boutique-ink">
                            Редакция
                          </summary>
                          <form action={updateFaqItem} className="mt-3 space-y-2 text-left">
                            <input type="hidden" name={adminFormFields.common.id} value={item.id} />
                            <input
                              name={adminFormFields.faq.itemQuestion}
                              required
                              defaultValue={item.question}
                              className={adminFieldClass}
                            />
                            <textarea
                              name={adminFormFields.faq.itemAnswer}
                              required
                              rows={3}
                              defaultValue={item.answer}
                              className={`${adminFieldClass} resize-y`}
                            />
                            <input
                              name={adminFormFields.faq.itemSortOrder}
                              type="number"
                              min="0"
                              defaultValue={item.sort_order}
                              className={adminFieldClass}
                            />
                            <label className="inline-flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                name={adminFormFields.faq.itemIsActive}
                                defaultChecked={item.is_active}
                                className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                              />
                              Активен
                            </label>
                            <button className="w-full rounded-full bg-boutique-ink px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white">
                              Запази
                            </button>
                          </form>
                          <AdminConfirmForm
                            action={deleteFaqItem}
                            confirmMessage={deleteMessage}
                            className="mt-2"
                          >
                            <input type="hidden" name={adminFormFields.common.id} value={item.id} />
                            <button className="w-full rounded-full border border-red-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                              Изтрий
                            </button>
                          </AdminConfirmForm>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}
