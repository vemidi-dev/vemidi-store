import { createCategory } from "@/app/admin/actions";
import { CategoryManagementView } from "@/components/admin/category-management-view";
import {
  adminAccordionClass,
  adminAccordionSummaryClass,
  adminFieldClass,
  adminPanelClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { CategoryRow } from "@/lib/admin/types";

export function CategoryManagementPanel({ categories }: { categories: CategoryRow[] }) {
  const parentCategories = categories
    .filter(
      (category) =>
        category.category_type === "product" && category.parent_id === null,
    )
    .sort((left, right) => left.name.localeCompare(right.name, "bg"));

  return (
    <article className={adminPanelClass}>
      <h2 className="font-heading text-2xl text-boutique-ink">
        Управление на категории
      </h2>
      <p className="mt-2 text-sm text-boutique-muted">
        Компактен списък с табове за продуктови категории и поводи. Пренареждането важи
        в рамките на активния таб.
      </p>

      <details className={`${adminAccordionClass} mt-6`}>
        <summary
          className={adminAccordionSummaryClass}
          aria-label="Добави нова категория — формуляр"
        >
          <span className="font-heading text-lg text-boutique-ink">Добави нова категория</span>
          <span className="text-sm font-normal text-boutique-muted" aria-hidden>
            Формуляр
          </span>
        </summary>
        <form
          action={createCategory}
          className="border-t border-boutique-line/80 px-4 pb-4 pt-4 sm:px-5 sm:pb-5"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <input type="hidden" name={adminFormFields.common.tab} value="categories" />
            <label className="text-sm font-medium text-boutique-ink">
              Име на категория
              <input
                name={adminFormFields.category.name}
                required
                placeholder="Напр. Сватба"
                className={adminFieldClass}
              />
            </label>
            <label className="text-sm font-medium text-boutique-ink">
              Slug
              <input
                name={adminFormFields.category.slug}
                required
                placeholder="napr-svatba"
                className={adminFieldClass}
              />
            </label>
            <label className="text-sm font-medium text-boutique-ink">
              Тип категория
              <select
                name={adminFormFields.category.type}
                required
                defaultValue="product"
                className={adminFieldClass}
              >
                <option value="product">Продуктова категория</option>
                <option value="occasion">Повод</option>
              </select>
            </label>
            <label className="text-sm font-medium text-boutique-ink">
              Основна категория
              <select
                name={adminFormFields.category.parentId}
                defaultValue=""
                className={adminFieldClass}
              >
                <option value="">Няма — основна категория</option>
                {parentCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-boutique-muted">
                Използва се само за продуктови подкатегории.
              </span>
            </label>
            <label className="text-sm font-medium text-boutique-ink md:col-span-2 xl:col-span-4">
              Кратък текст за картата
              <textarea
                name={adminFormFields.category.cardDescription}
                rows={2}
                placeholder="Кратко описание под името на категорията"
                className={`${adminFieldClass} min-h-16 resize-y`}
              />
            </label>
            <label className="text-sm font-medium text-boutique-ink md:col-span-2 xl:col-span-4">
              Снимка на категорията
              <input
                name={adminFormFields.category.imageFile}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className={`${adminFieldClass} file:mr-3 file:rounded-full file:border-0 file:bg-boutique-sage file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white`}
              />
              <span className="mt-1 block text-xs font-normal text-boutique-muted">
                Ако не качите снимка, сайтът ще използва текущата резервна снимка по slug.
              </span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-boutique-ink md:col-span-2 xl:col-span-4">
              <input
                name={adminFormFields.category.showOnHome}
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
              />
              Показвай на началната страница
            </label>
            <div className="self-end">
              <button
                type="submit"
                className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
              >
                Добави
              </button>
            </div>
          </div>
        </form>
      </details>

      {categories.length === 0 ? (
        <p className="mt-5 text-sm text-boutique-muted">Все още няма категории.</p>
      ) : (
        <CategoryManagementView categories={categories} />
      )}
    </article>
  );
}
