import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/app/admin/actions";
import {
  adminFieldClass,
  adminPanelClass,
} from "@/components/admin/styles";
import type { CategoryRow } from "@/lib/admin/types";

export function CategoryManagementPanel({ categories }: { categories: CategoryRow[] }) {
  return (
    <article className={adminPanelClass}>
      <h2 className="font-heading text-2xl text-boutique-ink">
        Управление на категории
      </h2>
      <p className="mt-2 text-sm text-boutique-muted">
        Добавяйте, редактирайте и изтривайте категориите, използвани във формите за продукти.
      </p>

      <form action={createCategory} className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <input type="hidden" name="tab" value="categories" />
        <label className="text-sm font-medium text-boutique-ink">
          Име на категория
          <input name="name" required placeholder="Напр. Сватба" className={adminFieldClass} />
        </label>
        <label className="text-sm font-medium text-boutique-ink">
          Slug
          <input name="slug" required placeholder="napr-svatba" className={adminFieldClass} />
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
        <ul className="mt-6 space-y-3">
          {categories.map((category) => (
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
                  <input type="hidden" name="tab" value="categories" />
                  <input type="hidden" name="id" value={category.id} />
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
                  className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]"
                >
                  <input type="hidden" name="tab" value="categories" />
                  <input type="hidden" name="id" value={category.id} />
                  <label className="text-sm font-medium text-boutique-ink">
                    Име на категория
                    <input
                      name="name"
                      required
                      defaultValue={category.name}
                      className={adminFieldClass}
                    />
                  </label>
                  <label className="text-sm font-medium text-boutique-ink">
                    Slug
                    <input
                      name="slug"
                      required
                      defaultValue={category.slug}
                      className={adminFieldClass}
                    />
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
    </article>
  );
}
