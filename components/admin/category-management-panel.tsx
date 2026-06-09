import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/app/admin/actions";
import {
  adminFieldClass,
  adminPanelClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { CategoryRow } from "@/lib/admin/types";

export function CategoryManagementPanel({ categories }: { categories: CategoryRow[] }) {
  const categoryGroups = [
    {
      type: "product" as const,
      title: "Продуктови категории",
      description: "Видове изделия и продуктови линии, например декорации, пликове или фигурки.",
    },
    {
      type: "occasion" as const,
      title: "Категории по повод",
      description: "Поводи, за които се търси подарък, например сватба, юбилей или рожден ден.",
    },
  ];

  return (
    <article className={adminPanelClass}>
      <h2 className="font-heading text-2xl text-boutique-ink">
        Управление на категории
      </h2>
      <p className="mt-2 text-sm text-boutique-muted">
        Категориите са разделени на видове продукти и поводи. Един продукт може да бъде включен в повече от една категория.
      </p>

      <form action={createCategory} className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
        <input type="hidden" name={adminFormFields.common.tab} value="categories" />
        <label className="text-sm font-medium text-boutique-ink">
          Име на категория
          <input name={adminFormFields.category.name} required placeholder="Напр. Сватба" className={adminFieldClass} />
        </label>
        <label className="text-sm font-medium text-boutique-ink">
          Slug
          <input name={adminFormFields.category.slug} required placeholder="napr-svatba" className={adminFieldClass} />
        </label>
        <label className="text-sm font-medium text-boutique-ink">
          Тип категория
          <select name={adminFormFields.category.type} required defaultValue="product" className={adminFieldClass}>
            <option value="product">Продуктова категория</option>
            <option value="occasion">Повод</option>
          </select>
        </label>
        <div className="self-end">
          <button
            type="submit"
            className="rounded-full bg-boutique-ink px-5 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
          >
            Добави категория
          </button>
        </div>
      </form>

      {categories.length === 0 ? (
        <p className="mt-5 text-sm text-boutique-muted">Все още няма категории.</p>
      ) : (
        <div className="mt-8 space-y-8">
          {categoryGroups.map((group) => {
            const groupedCategories = categories.filter(
              (category) => category.category_type === group.type,
            );

            return (
              <section key={group.type}>
                <h3 className="font-heading text-xl text-boutique-ink">{group.title}</h3>
                <p className="mt-1 text-sm text-boutique-muted">{group.description}</p>
                {groupedCategories.length === 0 ? (
                  <p className="mt-4 rounded-lg border border-dashed border-boutique-line px-4 py-3 text-sm text-boutique-muted">
                    Няма добавени категории в тази група.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {groupedCategories.map((category) => (
                      <li
                        key={category.id}
                        className="rounded-lg border border-boutique-line/70 bg-boutique-bg p-4"
                      >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-boutique-ink">{category.name}</p>
                  <p className="text-xs text-boutique-muted">Slug: {category.slug}</p>
                </div>
                <form action={deleteCategory}>
                  <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                  <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 transition hover:bg-red-50"
                  >
                    Изтрий
                  </button>
                </form>
              </div>

              <details className="mt-3 rounded-lg border border-boutique-line/70 bg-boutique-paper p-3">
                <summary className="cursor-pointer text-sm font-semibold text-boutique-ink">
                  Редактирай категория
                </summary>
                <form
                  action={updateCategory}
                  className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <input type="hidden" name={adminFormFields.common.tab} value="categories" />
                  <input type="hidden" name={adminFormFields.common.id} value={category.id} />
                  <label className="text-sm font-medium text-boutique-ink">
                    Име на категория
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
                    Тип категория
                    <select
                      name={adminFormFields.category.type}
                      defaultValue={category.category_type}
                      className={adminFieldClass}
                    >
                      <option value="product">Продуктова категория</option>
                      <option value="occasion">Повод</option>
                    </select>
                  </label>
                  <div className="self-end">
                    <button
                      type="submit"
                      className="rounded-full bg-boutique-ink px-5 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
                    >
                      Запази
                    </button>
                  </div>
                </form>
              </details>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </article>
  );
}
