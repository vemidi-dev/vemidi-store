"use client";

import { useMemo, useState } from "react";

import {
  deleteCategory,
  moveCategory,
  updateCategory,
} from "@/app/admin/actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import { AdminOpenDetailsButton } from "@/components/admin/admin-open-details-button";
import { CategoryContentSeoFields } from "@/components/admin/category-content-seo-fields";
import { CategoryRelatedSelector } from "@/components/admin/category-related-selector";
import {
  adminFieldClass,
  adminTableHeadClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import { hasCategoryContentGap } from "@/lib/admin/category-content";
import type { CategoryRow, CategoryType } from "@/lib/admin/types";

type CategoryManagementViewProps = {
  categories: CategoryRow[];
  productCountByCategoryId: Map<string, number>;
  relatedCategoryIdsByCategoryId: Map<string, string[]>;
};

type CategoryTab = CategoryType;

const tabLabels: Record<CategoryTab, string> = {
  product: "Р СџР С• Р С—РЎР‚Р С•Р Т‘РЎС“Р С”РЎвЂљ",
  occasion: "Р СџР С• Р С—Р С•Р Р†Р С•Р Т‘",
  material: "Р вЂ”Р В°Р С–Р С•РЎвЂљР С•Р Р†Р С”Р С‘ Р С‘ Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В»Р С‘",
};

const categoryTabs: CategoryTab[] = ["product", "occasion", "material"];

function getCategoryTypeLabel(categoryType: CategoryType) {
  if (categoryType === "product") {
    return "РџСЂРѕРґСѓРєС‚";
  }
  if (categoryType === "material") {
    return "РњР°С‚РµСЂРёР°Р»";
  }
  return "РџРѕРІРѕРґ";
}

export function CategoryManagementView({
  categories,
  productCountByCategoryId,
  relatedCategoryIdsByCategoryId,
}: CategoryManagementViewProps) {
  const [activeTab, setActiveTab] = useState<CategoryTab>("product");
  const [query, setQuery] = useState("");

  const sortedCategories = useMemo(() => {
    const byOrder = (left: CategoryRow, right: CategoryRow) => {
      const positionDifference = left.home_sort_order - right.home_sort_order;
      return positionDifference || left.name.localeCompare(right.name, "bg");
    };
    const matching = categories.filter(
      (category) => category.category_type === activeTab,
    );
    const roots = matching
      .filter((category) => category.parent_id === null)
      .sort(byOrder);
    const rootIds = new Set(roots.map((category) => category.id));
    const nested = roots.flatMap((root) => [
      root,
      ...matching
        .filter((category) => category.parent_id === root.id)
        .sort(byOrder),
    ]);
    const orphans = matching
      .filter(
        (category) =>
          category.parent_id !== null && !rootIds.has(category.parent_id),
      )
      .sort(byOrder);
    return [...nested, ...orphans];
  }, [activeTab, categories]);

  const normalizedQuery = query.trim().toLocaleLowerCase("bg");
  const visibleCategories = sortedCategories.filter((category) => {
    if (!normalizedQuery) {
      return true;
    }
    const searchable = `${category.name} ${category.slug}`.toLocaleLowerCase("bg");
    return searchable.includes(normalizedQuery);
  });

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2 border-b border-boutique-line pb-3">
        {categoryTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab
                ? "bg-boutique-ink text-boutique-paper"
                : "border border-boutique-line text-boutique-ink hover:border-boutique-sage-deep/40"
            }`}
          >
            {tabLabels[tab]}
            <span className="ml-1.5 text-xs opacity-75">
              ({categories.filter((category) => category.category_type === tab).length})
            </span>
          </button>
        ))}
      </div>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-boutique-muted">
        Р В РЎС›Р РЋР вЂ°Р РЋР вЂљР РЋР С“Р В Р’ВµР В Р вЂ¦Р В Р’Вµ
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Р В Р’ВР В РЎВР В Р’Вµ Р В РЎвЂР В Р’В»Р В РЎвЂ slug..."
          className="mt-1.5 w-full max-w-md rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink outline-none focus:border-boutique-accent/50"
        />
      </label>

      {visibleCategories.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-boutique-line px-4 py-3 text-sm text-boutique-muted">
          Р В РЎСљР РЋР РЏР В РЎВР В Р’В° Р В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В Р’ВµР В РЎвЂ“Р В РЎвЂўР РЋР вЂљР В РЎвЂР В РЎвЂ Р В Р вЂ  Р РЋРІР‚С™Р В Р’В°Р В Р’В·Р В РЎвЂ Р В РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР В РЎвЂ”Р В Р’В°{normalizedQuery ? " Р В РЎвЂ”Р В РЎвЂў Р РЋРІР‚С™Р РЋР вЂ°Р РЋР вЂљР РЋР С“Р В Р’ВµР В Р вЂ¦Р В Р’ВµР РЋРІР‚С™Р В РЎвЂў" : ""}.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-boutique-line">
          <div
            className={`${adminTableHeadClass} hidden px-3 py-2 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6rem_5rem_4rem_auto] md:gap-2`}
            aria-hidden
          >
            <span>Р В Р’ВР В РЎВР В Р’Вµ</span>
            <span>Slug</span>
            <span>Р В РІР‚в„ўР В РЎвЂР В РўвЂ</span>
            <span>Р В РЎСљР В Р’В°Р РЋРІР‚РЋР В Р’В°Р В Р’В»Р В Р вЂ¦Р В Р’В°</span>
            <span>Р В Р’В Р В Р’ВµР В РўвЂ</span>
            <span className="text-right">Р В РІР‚СњР В Р’ВµР В РІвЂћвЂ“Р РЋР С“Р РЋРІР‚С™Р В Р вЂ Р В РЎвЂР РЋР РЏ</span>
          </div>

          {visibleCategories.map((category) => {
            const siblings = sortedCategories.filter(
              (entry) => entry.parent_id === category.parent_id,
            );
            const indexInTab = siblings.findIndex(
              (entry) => entry.id === category.id,
            );
            const parentCategory = category.parent_id
              ? categories.find((entry) => entry.id === category.parent_id)
              : null;

            const productCount = productCountByCategoryId.get(category.id) ?? 0;

            return (
            <div
              key={category.id}
              className="border-b border-boutique-line/70 bg-white last:border-b-0"
            >
              <div className="hidden px-3 py-2 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6rem_5rem_4rem_auto] md:items-center md:gap-2">
                <p className="truncate font-medium text-boutique-ink">
                  {parentCategory ? "Р Р†РІР‚В РЎвЂ“ " : ""}
                  {category.name}
                  {category.is_visible === false ? (
                    <span className="ml-2 rounded-full bg-boutique-muted/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-muted">
                      Р В Р Р‹Р В РЎвЂќР РЋР вЂљР В РЎвЂР РЋРІР‚С™Р В Р’В°
                    </span>
                  ) : null}
                  {hasCategoryContentGap(category) ? (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Р В РІР‚С”Р В РЎвЂР В РЎвЂ”Р РЋР С“Р В Р вЂ Р В Р’В° Р РЋР С“Р РЋР вЂ°Р В РўвЂР РЋР вЂ°Р РЋР вЂљР В Р’В¶Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-boutique-muted">{category.slug}</p>
                <p className="text-xs text-boutique-muted">
                  {getCategoryTypeLabel(category.category_type)}
                </p>
                <p className="text-xs text-boutique-muted">
                  {category.show_on_home ? "Р В РІР‚СњР В Р’В°" : "Р В РЎСљР В Р’Вµ"}
                </p>
                <p className="text-xs text-boutique-muted">{category.home_sort_order}</p>
                <div className="flex flex-wrap justify-end gap-1">
                  <form action={moveCategory} className="inline">
                    <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                    <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                    <input type="hidden" name={adminFormFields.category.direction} value="up" />
                    <button
                      type="submit"
                      disabled={indexInTab === 0}
                      aria-label="Р В РЎСџР РЋР вЂљР В Р’ВµР В РЎВР В Р’ВµР РЋР С“Р РЋРІР‚С™Р В РЎвЂ Р В Р вЂ¦Р В Р’В°Р В РЎвЂ“Р В РЎвЂўР РЋР вЂљР В Р’Вµ"
                      className="grid h-7 w-7 place-items-center rounded-full border border-boutique-line text-xs disabled:opacity-35"
                    >
                      Р Р†РІР‚В РІР‚В
                    </button>
                  </form>
                  <form action={moveCategory} className="inline">
                    <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                    <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                    <input type="hidden" name={adminFormFields.category.direction} value="down" />
                    <button
                      type="submit"
                      disabled={indexInTab === siblings.length - 1}
                      aria-label="Р В РЎСџР РЋР вЂљР В Р’ВµР В РЎВР В Р’ВµР РЋР С“Р РЋРІР‚С™Р В РЎвЂ Р В Р вЂ¦Р В Р’В°Р В РўвЂР В РЎвЂўР В Р’В»Р РЋРЎвЂњ"
                      className="grid h-7 w-7 place-items-center rounded-full border border-boutique-line text-xs disabled:opacity-35"
                    >
                      Р Р†РІР‚В РІР‚Сљ
                    </button>
                  </form>
                  <AdminOpenDetailsButton
                    detailsId={`category-edit-${category.id}`}
                    className="rounded-full border border-boutique-line px-2.5 py-1 text-[11px] font-semibold text-boutique-ink"
                  >
                    Р В Р’В Р В Р’ВµР В РўвЂР В Р’В°Р В РЎвЂќР РЋРІР‚В Р В РЎвЂР РЋР РЏ
                  </AdminOpenDetailsButton>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 px-2 py-2 md:hidden">
                <div className="min-w-0">
                  <p className="truncate font-medium text-boutique-ink">
                    {parentCategory ? "Р Р†РІР‚В РЎвЂ“ " : ""}
                    {category.name}
                    {category.is_visible === false ? (
                      <span className="ml-2 rounded-full bg-boutique-muted/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-muted">
                        Р В Р Р‹Р В РЎвЂќР РЋР вЂљР В РЎвЂР РЋРІР‚С™Р В Р’В°
                      </span>
                    ) : null}
                    {hasCategoryContentGap(category) ? (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        Р В РІР‚С”Р В РЎвЂР В РЎвЂ”Р РЋР С“Р В Р вЂ Р В Р’В° Р РЋР С“Р РЋР вЂ°Р В РўвЂР РЋР вЂ°Р РЋР вЂљР В Р’В¶Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-boutique-muted">{category.slug}</p>
                </div>
                <div className="flex gap-1">
                  <form action={moveCategory}>
                    <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                    <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                    <input type="hidden" name={adminFormFields.category.direction} value="up" />
                    <button
                      type="submit"
                      disabled={indexInTab === 0}
                      className="grid h-7 w-7 place-items-center rounded-full border border-boutique-line text-xs disabled:opacity-35"
                    >
                      Р Р†РІР‚В РІР‚В
                    </button>
                  </form>
                  <form action={moveCategory}>
                    <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                    <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                    <input type="hidden" name={adminFormFields.category.direction} value="down" />
                    <button
                      type="submit"
                      disabled={indexInTab === siblings.length - 1}
                      className="grid h-7 w-7 place-items-center rounded-full border border-boutique-line text-xs disabled:opacity-35"
                    >
                      Р Р†РІР‚В РІР‚Сљ
                    </button>
                  </form>
                </div>
              </div>

              <details
                id={`category-edit-${category.id}`}
                className="border-t border-boutique-line/60 bg-boutique-bg/40 px-3 py-2"
              >
                <summary className="cursor-pointer text-xs font-semibold text-boutique-sage-deep md:sr-only">
                  Р В Р’В Р В Р’ВµР В РўвЂР В Р’В°Р В РЎвЂќР РЋРІР‚С™Р В РЎвЂР РЋР вЂљР В Р’В°Р В РІвЂћвЂ“ Р В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В Р’ВµР В РЎвЂ“Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР РЏ
                </summary>
                <form
                  action={updateCategory}
                  className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                  <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                  <label className="text-sm font-medium text-boutique-ink">
                    Р В Р’ВР В РЎВР В Р’Вµ
                    <input
                      name={adminFormFields.category.name}
                      required
                      defaultValue={category.name}
                      className={adminFieldClass}
                    />
                  </label>
                  <label className="text-sm font-medium text-boutique-ink">
                    Slug
                    <input
                      name={adminFormFields.category.slug}
                      required
                      defaultValue={category.slug}
                      className={adminFieldClass}
                    />
                  </label>
                  <label className="text-sm font-medium text-boutique-ink">
                    Р В РЎС›Р В РЎвЂР В РЎвЂ”
                    <select
                      name={adminFormFields.category.type}
                      defaultValue={category.category_type}
                      className={adminFieldClass}
                    >
                      <option value="product">Р В РЎСџР РЋР вЂљР В РЎвЂўР В РўвЂР РЋРЎвЂњР В РЎвЂќР РЋРІР‚С™Р В РЎвЂўР В Р вЂ Р В Р’В° Р В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В Р’ВµР В РЎвЂ“Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР РЏ</option>
                      <option value="occasion">Р В РЎСџР В РЎвЂўР В Р вЂ Р В РЎвЂўР В РўвЂ</option>
                      <option value="material">Р В РІР‚вЂќР В Р’В°Р В РЎвЂ“Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂўР В Р вЂ Р В РЎвЂќР В РЎвЂ Р В РЎвЂ Р В РЎВР В Р’В°Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В РЎвЂР В Р’В°Р В Р’В»Р В РЎвЂ</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-boutique-ink">
                    Р В РЎвЂєР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р В Р вЂ¦Р В Р’В° Р В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В Р’ВµР В РЎвЂ“Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР РЏ
                    <select
                      name={adminFormFields.category.parentId}
                      defaultValue={category.parent_id ?? ""}
                      className={adminFieldClass}
                    >
                      <option value="">Р В РЎСљР РЋР РЏР В РЎВР В Р’В° Р Р†Р вЂљРІР‚Сњ Р В РЎвЂўР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р В Р вЂ¦Р В Р’В° Р В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В Р’ВµР В РЎвЂ“Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР РЏ</option>
                      {categories
                        .filter(
                          (entry) =>
                            (entry.category_type === "product" ||
                              entry.category_type === "material") &&
                            entry.parent_id === null &&
                            entry.id !== category.id,
                        )
                        .sort((left, right) =>
                          left.name.localeCompare(right.name, "bg"),
                        )
                        .map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-boutique-ink md:col-span-3">
                    Р В РЎв„ўР РЋР вЂљР В Р’В°Р РЋРІР‚С™Р РЋР вЂ°Р В РЎвЂќ Р РЋРІР‚С™Р В Р’ВµР В РЎвЂќР РЋР С“Р РЋРІР‚С™ Р В Р’В·Р В Р’В° Р В РЎвЂќР В Р’В°Р РЋР вЂљР РЋРІР‚С™Р В Р’В°Р РЋРІР‚С™Р В Р’В°
                    <textarea
                      name={adminFormFields.category.cardDescription}
                      rows={2}
                      defaultValue={category.card_description ?? ""}
                      className={`${adminFieldClass} min-h-16 resize-y`}
                    />
                  </label>
                  <label className="text-sm font-medium text-boutique-ink md:col-span-3">
                    Р В Р Р‹Р В Р вЂ¦Р В РЎвЂР В РЎВР В РЎвЂќР В Р’В° Р В Р’В·Р В Р’В° Р В РЎвЂќР В Р’В°Р РЋР вЂљР РЋРІР‚С™Р В Р’В° Р В Р вЂ¦Р В Р’В° Р В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В Р’ВµР В РЎвЂ“Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР РЏР РЋРІР‚С™Р В Р’В°
                    {category.image_url ? (
                      <span className="mt-2 flex items-center gap-3 rounded-lg border border-boutique-line bg-white p-2">
                        <span
                          className="h-16 w-20 rounded-md bg-cover bg-center"
                          style={{ backgroundImage: `url(${category.image_url})` }}
                          aria-hidden
                        />
                        <span className="text-xs font-normal text-boutique-muted">
                          Р В РЎв„ўР В Р’В°Р РЋРІР‚РЋР В Р’ВµР РЋРІР‚С™Р В Р’Вµ Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р В Р’В° Р РЋР С“Р В Р вЂ¦Р В РЎвЂР В РЎВР В РЎвЂќР В Р’В°, Р В Р’В·Р В Р’В° Р В РўвЂР В Р’В° Р В Р’В·Р В Р’В°Р В РЎВР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋРІР‚С™Р В Р’Вµ Р РЋРІР‚С™Р В Р’ВµР В РЎвЂќР РЋРЎвЂњР РЋРІР‚В°Р В Р’В°Р РЋРІР‚С™Р В Р’В°.
                        </span>
                      </span>
                    ) : null}
                    <input
                      name={adminFormFields.category.imageFile}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className={`${adminFieldClass} file:mr-3 file:rounded-full file:border-0 file:bg-boutique-sage file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white`}
                    />
                  </label>
                  <label className="text-sm font-medium text-boutique-ink md:col-span-3">
                    Alt Р РЋРІР‚С™Р В Р’ВµР В РЎвЂќР РЋР С“Р РЋРІР‚С™ Р В Р’В·Р В Р’В° Р В РЎвЂќР В Р’В°Р РЋР вЂљР РЋРІР‚С™Р В Р’В°
                    <input
                      name={adminFormFields.category.imageAlt}
                      type="text"
                      maxLength={160}
                      defaultValue={category.image_alt ?? ""}
                      placeholder="Р В РЎв„ўР РЋР вЂљР В Р’В°Р РЋРІР‚С™Р В РЎвЂќР В РЎвЂў Р В РЎвЂўР В РЎвЂ”Р В РЎвЂР РЋР С“Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В Р вЂ¦Р В Р’В° Р РЋР С“Р В Р вЂ¦Р В РЎвЂР В РЎВР В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В Р’В° Р В Р’В·Р В Р’В° Р В РЎвЂќР В Р’В°Р РЋР вЂљР РЋРІР‚С™Р В Р’В°Р РЋРІР‚С™Р В Р’В°"
                      className={adminFieldClass}
                    />
                  </label>
                  <label className="text-sm font-medium text-boutique-ink md:col-span-3">
                    Cover Р РЋР С“Р В Р вЂ¦Р В РЎвЂР В РЎВР В РЎвЂќР В Р’В° Р В Р’В·Р В Р’В° Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋРІР‚В Р В Р’В°Р РЋРІР‚С™Р В Р’В°
                    {category.cover_image_url ? (
                      <span className="mt-2 flex items-center gap-3 rounded-lg border border-boutique-line bg-white p-2">
                        <span
                          className="h-16 w-28 rounded-md bg-cover bg-center"
                          style={{ backgroundImage: `url(${category.cover_image_url})` }}
                          aria-hidden
                        />
                        <span className="text-xs font-normal text-boutique-muted">
                          Р В РЎв„ўР В Р’В°Р РЋРІР‚РЋР В Р’ВµР РЋРІР‚С™Р В Р’Вµ Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р В Р’В° cover Р РЋР С“Р В Р вЂ¦Р В РЎвЂР В РЎВР В РЎвЂќР В Р’В°, Р В Р’В·Р В Р’В° Р В РўвЂР В Р’В° Р В Р’В·Р В Р’В°Р В РЎВР В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋРІР‚С™Р В Р’Вµ Р РЋРІР‚С™Р В Р’ВµР В РЎвЂќР РЋРЎвЂњР РЋРІР‚В°Р В Р’В°Р РЋРІР‚С™Р В Р’В°.
                        </span>
                      </span>
                    ) : null}
                    <input
                      name={adminFormFields.category.coverImageFile}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className={`${adminFieldClass} file:mr-3 file:rounded-full file:border-0 file:bg-boutique-sage file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white`}
                    />
                  </label>
                  <label className="text-sm font-medium text-boutique-ink md:col-span-3">
                    Alt Р РЋРІР‚С™Р В Р’ВµР В РЎвЂќР РЋР С“Р РЋРІР‚С™ Р В Р’В·Р В Р’В° cover
                    <input
                      name={adminFormFields.category.coverImageAlt}
                      type="text"
                      maxLength={160}
                      defaultValue={category.cover_image_alt ?? ""}
                      placeholder="Р В РЎв„ўР РЋР вЂљР В Р’В°Р РЋРІР‚С™Р В РЎвЂќР В РЎвЂў Р В РЎвЂўР В РЎвЂ”Р В РЎвЂР РЋР С“Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В Р вЂ¦Р В Р’В° cover Р РЋР С“Р В Р вЂ¦Р В РЎвЂР В РЎВР В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В Р’В°"
                      className={adminFieldClass}
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-boutique-ink md:col-span-3">
                    <input
                      name={adminFormFields.category.isVisible}
                      type="checkbox"
                      defaultChecked={category.is_visible !== false}
                      role="switch"
                      aria-label="Р В РЎСџР В РЎвЂўР В РЎвЂќР В Р’В°Р В Р’В·Р В Р вЂ Р В Р’В°Р В РІвЂћвЂ“ Р В Р вЂ  Р В РЎВР В Р’В°Р В РЎвЂ“Р В Р’В°Р В Р’В·Р В РЎвЂР В Р вЂ¦Р В Р’В°"
                      className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                    />
                    Р В РЎСџР В РЎвЂўР В РЎвЂќР В Р’В°Р В Р’В·Р В Р вЂ Р В Р’В°Р В РІвЂћвЂ“ Р В Р вЂ  Р В РЎВР В Р’В°Р В РЎвЂ“Р В Р’В°Р В Р’В·Р В РЎвЂР В Р вЂ¦Р В Р’В°
                  </label>
                  {productCount === 0 ? (
                    <p className="text-xs text-boutique-muted md:col-span-3">
                      Р В РЎв„ўР В Р’В°Р РЋРІР‚С™Р В Р’ВµР В РЎвЂ“Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР РЏР РЋРІР‚С™Р В Р’В° Р В Р вЂ¦Р РЋР РЏР В РЎВР В Р’В° Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В РўвЂР РЋРЎвЂњР В РЎвЂќР РЋРІР‚С™Р В РЎвЂ. Р В РЎС™Р В РЎвЂўР В Р’В¶Р В Р’ВµР РЋРІР‚С™Р В Р’Вµ Р В РўвЂР В Р’В° Р РЋР РЏ Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р В Р’В°Р В Р вЂ Р В РЎвЂР РЋРІР‚С™Р В Р’Вµ Р В Р вЂ Р В РЎвЂР В РўвЂР В РЎвЂР В РЎВР В Р’В° Р В РЎвЂР В Р’В»Р В РЎвЂ Р В РўвЂР В Р’В° Р РЋР РЏ
                      Р РЋР С“Р В РЎвЂќР РЋР вЂљР В РЎвЂР В Р’ВµР РЋРІР‚С™Р В Р’Вµ Р В РЎвЂўР РЋРІР‚С™ Р В РЎВР В Р’В°Р В РЎвЂ“Р В Р’В°Р В Р’В·Р В РЎвЂР В Р вЂ¦Р В Р’В°.
                    </p>
                  ) : null}
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-boutique-ink md:col-span-3">
                    <input
                      name={adminFormFields.category.showOnHome}
                      type="checkbox"
                      defaultChecked={category.show_on_home}
                      className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                    />
                    Р В РЎСџР В РЎвЂўР В РЎвЂќР В Р’В°Р В Р’В·Р В Р вЂ Р В Р’В°Р В РІвЂћвЂ“ Р В Р вЂ¦Р В Р’В° Р В Р вЂ¦Р В Р’В°Р РЋРІР‚РЋР В Р’В°Р В Р’В»Р В Р вЂ¦Р В Р’В°Р РЋРІР‚С™Р В Р’В° Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋРІР‚В Р В Р’В°
                  </label>
                  <div className="md:col-span-3">
                    <CategoryContentSeoFields category={category} />
                  </div>
                  {category.category_type === "product" ? (
                    <div className="md:col-span-3">
                      <CategoryRelatedSelector
                        categories={categories}
                        excludeCategoryId={category.id}
                        selectedRelatedIds={
                          relatedCategoryIdsByCategoryId.get(category.id) ?? []
                        }
                        categoryType={category.category_type}
                      />
                    </div>
                  ) : null}
                  <div className="self-end">
                    <button
                      type="submit"
                      className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper"
                    >
                      Р В РІР‚вЂќР В Р’В°Р В РЎвЂ”Р В Р’В°Р В Р’В·Р В РЎвЂ
                    </button>
                  </div>
                </form>
                <AdminConfirmForm
                  action={deleteCategory}
                  confirmMessage={`Р В Р Р‹Р В РЎвЂР В РЎвЂ“Р РЋРЎвЂњР РЋР вЂљР В Р вЂ¦Р В РЎвЂ Р В Р’В»Р В РЎвЂ Р РЋР С“Р РЋРІР‚С™Р В Р’Вµ, Р РЋРІР‚РЋР В Р’Вµ Р В РЎвЂР РЋР С“Р В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В Р’Вµ Р В РўвЂР В Р’В° Р В РЎвЂР В Р’В·Р РЋРІР‚С™Р РЋР вЂљР В РЎвЂР В Р’ВµР РЋРІР‚С™Р В Р’Вµ Р Р†Р вЂљРЎвЂє${category.name}"?`}
                  className="mt-3 border-t border-red-100 pt-3"
                >
                  <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                  <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700"
                  >
                    Р В Р’ВР В Р’В·Р РЋРІР‚С™Р РЋР вЂљР В РЎвЂР В РІвЂћвЂ“ Р В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В Р’ВµР В РЎвЂ“Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР РЏР РЋРІР‚С™Р В Р’В°
                  </button>
                </AdminConfirmForm>
              </details>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
