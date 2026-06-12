"use client";

import { useRef, useState } from "react";

import { createWishTemplate } from "@/app/admin/wish-actions";
import { AdminSectionAccordion } from "@/components/admin/admin-section-accordion";
import { WishListView } from "@/components/admin/wish-list-view";
import { adminFieldClass, adminPanelClass } from "@/components/admin/styles";
import type {
  CategoryRow,
  WishTemplateOccasionRow,
  WishTemplateRow,
} from "@/lib/admin/types";

export function WishManagementPanel({
  occasions,
  wishes,
  links,
}: {
  occasions: CategoryRow[];
  wishes: WishTemplateRow[];
  links: WishTemplateOccasionRow[];
}) {
  const [createFormDirty, setCreateFormDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function confirmFilterChange() {
    if (!createFormDirty) {
      return true;
    }

    return window.confirm(
      "Имате незаписани промени във формата за добавяне. Смяната на филтъра ще ги запази, но няма да ги изпрати. Продължавате ли?",
    );
  }

  return (
    <article className={`${adminPanelClass} !p-5 md:!p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-heading text-xl text-boutique-ink">Готови пожелания</h2>
        {wishes.length > 0 ? (
          <span className="text-xs text-boutique-muted">
            {wishes.length} {wishes.length === 1 ? "пожелание" : "пожелания"}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-boutique-muted">
        Един текст може да бъде свързан с повече от един повод.
      </p>

      <div className="mt-4">
        <AdminSectionAccordion
          title="Добавяне на пожелание"
          countLabel="свиване / разгъване"
        >
          <form
            ref={formRef}
            action={createWishTemplate}
            className="grid gap-3"
            onChange={() => setCreateFormDirty(true)}
            onInput={() => setCreateFormDirty(true)}
          >
            <label className="text-xs font-medium text-boutique-ink">
              Нов текст
              <textarea
                name="body"
                required
                rows={3}
                placeholder="Текст на пожеланието"
                className={`${adminFieldClass} !mt-1 resize-y`}
              />
            </label>

            <fieldset>
              <legend className="text-xs font-semibold text-boutique-ink">Подходящо за</legend>
              <div className="mt-2 rounded-lg border border-boutique-line/70 bg-boutique-paper p-2">
                <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                  {occasions.map((occasion) => (
                    <label
                      key={occasion.id}
                      className="flex cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs text-boutique-ink transition hover:border-boutique-line hover:bg-white has-[:checked]:border-boutique-sage-deep/40 has-[:checked]:bg-boutique-sage-deep/5"
                    >
                      <input
                        type="checkbox"
                        name="category_ids"
                        value={occasion.id}
                        className="h-3.5 w-3.5 shrink-0 rounded border-boutique-line text-boutique-sage-deep"
                      />
                      <span className="leading-tight">{occasion.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>

            <div className="flex justify-end border-t border-boutique-line/60 pt-3">
              <button className="rounded-full bg-boutique-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-boutique-accent">
                Добави пожелание
              </button>
            </div>
          </form>
        </AdminSectionAccordion>
      </div>

      <WishListView
        occasions={occasions}
        wishes={wishes}
        links={links}
        createFormDirty={createFormDirty}
        onFilterAttempt={confirmFilterChange}
      />
    </article>
  );
}
