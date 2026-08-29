"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  deleteCategory,
  moveCategory,
  updateCategory,
} from "@/app/admin/actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { AdminFormPendingGuard } from "@/components/admin/admin-form-pending-guard";
import { CategoryContentSeoFields } from "@/components/admin/category-content-seo-fields";
import { CategoryRelatedSelector } from "@/components/admin/category-related-selector";
import {
  adminFieldClass,
  adminTableHeadClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import { hasCategoryContentGap } from "@/lib/admin/category-content";
import { makeAdminCategoriesHref } from "@/lib/admin/categories-href";
import type { CategoryRow, CategoryType } from "@/lib/admin/types";

type CategoryManagementViewProps = {
  categories: CategoryRow[];
  productCountByCategoryId: Map<string, number>;
  relatedCategoryIdsByCategoryId: Map<string, string[]>;
  initialCategoryType?: CategoryType;
  editCategoryId?: string;
};

type CategoryTab = CategoryType;

const tabLabels: Record<CategoryTab, string> = {
  product: "По продукт",
  occasion: "По повод",
  material: "Заготовки и материали",
};

const categoryTabs: CategoryTab[] = ["product", "occasion", "material"];

function getCategoryTypeLabel(categoryType: CategoryType) {
  if (categoryType === "product") {
    return "Продукт";
  }
  if (categoryType === "material") {
    return "Материал";
  }
  return "Повод";
}

export function CategoryManagementView({
  categories,
  productCountByCategoryId,
  relatedCategoryIdsByCategoryId,
  initialCategoryType = "product",
  editCategoryId,
}: CategoryManagementViewProps) {
  const [activeTab, setActiveTab] = useState<CategoryTab>(() => {
    if (editCategoryId) {
      const match = categories.find((category) => category.id === editCategoryId);
      if (match && categoryTabs.includes(match.category_type as CategoryTab)) {
        return match.category_type as CategoryTab;
      }
    }
    return categoryTabs.includes(initialCategoryType as CategoryTab)
      ? (initialCategoryType as CategoryTab)
      : "product";
  });
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (categoryTabs.includes(initialCategoryType as CategoryTab)) {
      setActiveTab(initialCategoryType as CategoryTab);
    }
  }, [initialCategoryType]);

  useEffect(() => {
    if (!editCategoryId) {
      return;
    }
    const match = categories.find((category) => category.id === editCategoryId);
    if (match && categoryTabs.includes(match.category_type as CategoryTab)) {
      setActiveTab(match.category_type as CategoryTab);
    }
  }, [categories, editCategoryId]);

  useEffect(() => {
    if (!editCategoryId) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const details = document.getElementById(`category-edit-${editCategoryId}`);
      if (details instanceof HTMLDetailsElement) {
        details.open = true;
        details.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, categories, editCategoryId]);

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
    if (editCategoryId && category.id === editCategoryId) {
      return true;
    }
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
        Търсене
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Име или slug..."
          className="mt-1.5 w-full max-w-md rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink outline-none focus:border-boutique-accent/50"
        />
      </label>

      {visibleCategories.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-boutique-line px-4 py-3 text-sm text-boutique-muted">
          Няма категории в тази група{normalizedQuery ? " по търсенето" : ""}.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-boutique-line">
          <div
            className={`${adminTableHeadClass} hidden px-3 py-2 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6rem_5rem_4rem_auto] md:gap-2`}
            aria-hidden
          >
            <span>Име</span>
            <span>Slug</span>
            <span>Вид</span>
            <span>Начална</span>
            <span>Ред</span>
            <span className="text-right">Действия</span>
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
                  {parentCategory ? "↳ " : ""}
                  {category.name}
                  {category.is_visible === false ? (
                    <span className="ml-2 rounded-full bg-boutique-muted/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-muted">
                      Скрита
                    </span>
                  ) : null}
                  {hasCategoryContentGap(category) ? (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Липсва съдържание
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-boutique-muted">{category.slug}</p>
                <p className="text-xs text-boutique-muted">
                  {getCategoryTypeLabel(category.category_type)}
                </p>
                <p className="text-xs text-boutique-muted">
                  {category.show_on_home ? "Да" : "Не"}
                </p>
                <p className="text-xs text-boutique-muted">{category.home_sort_order}</p>
                <div className="flex flex-wrap justify-end gap-1">
                  <form action={moveCategory} className="inline">
                    <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                    <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                    <input type="hidden" name={adminFormFields.category.type} value={category.category_type} />
                    <input type="hidden" name={adminFormFields.category.direction} value="up" />
                    <AdminSubmitButton
                      pendingLabel="…"
                      disabled={indexInTab === 0}
                      aria-label="Премести нагоре"
                      className="grid h-7 w-7 place-items-center rounded-full border border-boutique-line text-xs disabled:opacity-35"
                    >
                      ↑
                    </AdminSubmitButton>
                  </form>
                  <form action={moveCategory} className="inline">
                    <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                    <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                    <input type="hidden" name={adminFormFields.category.type} value={category.category_type} />
                    <input type="hidden" name={adminFormFields.category.direction} value="down" />
                    <AdminSubmitButton
                      pendingLabel="…"
                      disabled={indexInTab === siblings.length - 1}
                      aria-label="Премести надолу"
                      className="grid h-7 w-7 place-items-center rounded-full border border-boutique-line text-xs disabled:opacity-35"
                    >
                      ↓
                    </AdminSubmitButton>
                  </form>
                  <Link
                    href={makeAdminCategoriesHref({
                      categoryType: category.category_type,
                      editCategory: category.id,
                    })}
                    className="rounded-full border border-boutique-line px-2.5 py-1 text-[11px] font-semibold text-boutique-ink"
                  >
                    Редакция
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 px-2 py-2 md:hidden">
                <div className="min-w-0">
                  <p className="truncate font-medium text-boutique-ink">
                    {parentCategory ? "↳ " : ""}
                    {category.name}
                    {category.is_visible === false ? (
                      <span className="ml-2 rounded-full bg-boutique-muted/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-muted">
                        Скрита
                      </span>
                    ) : null}
                    {hasCategoryContentGap(category) ? (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        Липсва съдържание
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-boutique-muted">{category.slug}</p>
                </div>
                <div className="flex gap-1">
                  <form action={moveCategory}>
                    <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                    <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                    <input type="hidden" name={adminFormFields.category.type} value={category.category_type} />
                    <input type="hidden" name={adminFormFields.category.direction} value="up" />
                    <AdminSubmitButton
                      pendingLabel="…"
                      disabled={indexInTab === 0}
                      aria-label="Премести нагоре"
                      className="grid h-7 w-7 place-items-center rounded-full border border-boutique-line text-xs disabled:opacity-35"
                    >
                      ↑
                    </AdminSubmitButton>
                  </form>
                  <form action={moveCategory}>
                    <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                    <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                    <input type="hidden" name={adminFormFields.category.type} value={category.category_type} />
                    <input type="hidden" name={adminFormFields.category.direction} value="down" />
                    <AdminSubmitButton
                      pendingLabel="…"
                      disabled={indexInTab === siblings.length - 1}
                      aria-label="Премести надолу"
                      className="grid h-7 w-7 place-items-center rounded-full border border-boutique-line text-xs disabled:opacity-35"
                    >
                      ↓
                    </AdminSubmitButton>
                  </form>
                  <Link
                    href={makeAdminCategoriesHref({
                      categoryType: category.category_type,
                      editCategory: category.id,
                    })}
                    className="rounded-full border border-boutique-line px-2.5 py-1 text-[11px] font-semibold text-boutique-ink"
                  >
                    Редакция
                  </Link>
                </div>
              </div>

              <details
                id={`category-edit-${category.id}`}
                open={editCategoryId === category.id ? true : undefined}
                className="border-t border-boutique-line/60 bg-boutique-bg/40 px-3 py-2"
              >
                <summary className="cursor-pointer text-xs font-semibold text-boutique-sage-deep md:sr-only">
                  Редактирай категория
                </summary>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-boutique-ink">Редакция на категория</p>
                  <Link
                    href={makeAdminCategoriesHref({ categoryType: activeTab })}
                    className="rounded-full border border-boutique-line px-3 py-1.5 text-xs font-semibold text-boutique-muted transition hover:text-boutique-ink"
                  >
                    Затвори редакцията
                  </Link>
                </div>
                <form
                  action={updateCategory}
                  className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                  <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                  <label className="text-sm font-medium text-boutique-ink">
                    Име
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
                    Тип
                    <select
                      name={adminFormFields.category.type}
                      defaultValue={category.category_type}
                      className={adminFieldClass}
                    >
                      <option value="product">Продуктова категория</option>
                      <option value="occasion">Повод</option>
                      <option value="material">Заготовки и материали</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-boutique-ink">
                    Основна категория
                    <select
                      name={adminFormFields.category.parentId}
                      defaultValue={category.parent_id ?? ""}
                      className={adminFieldClass}
                    >
                      <option value="">Няма — основна категория</option>
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
                    Кратък текст за картата
                    <textarea
                      name={adminFormFields.category.cardDescription}
                      rows={2}
                      defaultValue={category.card_description ?? ""}
                      className={`${adminFieldClass} min-h-16 resize-y`}
                    />
                  </label>
                  <label className="text-sm font-medium text-boutique-ink md:col-span-3">
                    Снимка за карта на категорията
                    {category.image_url ? (
                      <span className="mt-2 flex items-center gap-3 rounded-lg border border-boutique-line bg-white p-2">
                        <span
                          className="h-16 w-20 rounded-md bg-cover bg-center"
                          style={{ backgroundImage: `url(${category.image_url})` }}
                          aria-hidden
                        />
                        <span className="text-xs font-normal text-boutique-muted">
                          Качете нова снимка, за да замените текущата.
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
                    Alt текст за карта
                    <input
                      name={adminFormFields.category.imageAlt}
                      type="text"
                      maxLength={160}
                      defaultValue={category.image_alt ?? ""}
                      placeholder="Кратко описание на снимката за картата"
                      className={adminFieldClass}
                    />
                  </label>
                  <label className="text-sm font-medium text-boutique-ink md:col-span-3">
                    Cover снимка за страницата
                    {category.cover_image_url ? (
                      <span className="mt-2 flex items-center gap-3 rounded-lg border border-boutique-line bg-white p-2">
                        <span
                          className="h-16 w-28 rounded-md bg-cover bg-center"
                          style={{ backgroundImage: `url(${category.cover_image_url})` }}
                          aria-hidden
                        />
                        <span className="text-xs font-normal text-boutique-muted">
                          Качете нова cover снимка, за да замените текущата.
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
                    Alt текст за cover
                    <input
                      name={adminFormFields.category.coverImageAlt}
                      type="text"
                      maxLength={160}
                      defaultValue={category.cover_image_alt ?? ""}
                      placeholder="Кратко описание на cover снимката"
                      className={adminFieldClass}
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-boutique-ink md:col-span-3">
                    <input
                      name={adminFormFields.category.isVisible}
                      type="checkbox"
                      defaultChecked={category.is_visible !== false}
                      role="switch"
                      aria-label="Показвай в магазина"
                      className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                    />
                    Показвай в магазина
                  </label>
                  {productCount === 0 ? (
                    <p className="text-xs text-boutique-muted md:col-span-3">
                      Категорията няма продукти. Можете да я оставите видима или да я
                      скриете от магазина.
                    </p>
                  ) : null}
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-boutique-ink md:col-span-3">
                    <input
                      name={adminFormFields.category.showOnHome}
                      type="checkbox"
                      defaultChecked={category.show_on_home}
                      className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                    />
                    Показвай на началната страница
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
                    <AdminSubmitButton
                      pendingLabel="Записване…"
                      className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper"
                    >
                      Запази
                    </AdminSubmitButton>
                  </div>
                  <div className="md:col-span-3">
                    <AdminFormPendingGuard message="Категорията се записва… Моля, изчакайте." />
                  </div>
                </form>
                <AdminConfirmForm
                  action={deleteCategory}
                  confirmMessage={`Сигурни ли сте, че искате да изтриете „${category.name}"?`}
                  className="mt-3 border-t border-red-100 pt-3"
                >
                  <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                  <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700"
                  >
                    Изтрий категорията
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
