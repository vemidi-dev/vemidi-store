import {
  createBlogCategory,
  deactivateBlogCategory,
  updateBlogCategory,
} from "@/app/admin/blog-category-actions";
import { AdminSectionAccordion } from "@/components/admin/admin-section-accordion";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
  adminTableHeadClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { BlogCategoryRow } from "@/lib/admin/types";

export function BlogCategoryManagementPanel({
  categories,
  error,
}: {
  categories: BlogCategoryRow[];
  error: { message: string } | null;
}) {
  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Блог категориите не могат да се заредят: {error.message}. Изпълнете
          blog_categories.sql.
        </div>
      ) : null}

      <article className={adminPanelClass}>
        <h2 className="font-heading text-2xl text-boutique-ink">Блог категории</h2>
        <p className="mt-2 text-sm leading-relaxed text-boutique-muted">
          Управлявайте темите за филтриране на /blog. Публичните линкове използват slug, не
          показваното име.
        </p>

        <form action={createBlogCategory} className="mt-5 grid gap-3 lg:grid-cols-4">
          <label className="text-sm font-medium text-boutique-ink">
            Име
            <input
              name={adminFormFields.blogCategory.name}
              required
              placeholder="Напр. Идеи за подаръци"
              className={adminFieldClass}
            />
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Slug
            <input
              name={adminFormFields.blogCategory.slug}
              required
              placeholder="idei-za-podaraci"
              className={adminFieldClass}
            />
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Подредба
            <input
              name={adminFormFields.blogCategory.sortOrder}
              type="number"
              defaultValue="0"
              className={adminFieldClass}
            />
          </label>
          <div className="flex items-end">
            <button className="w-full rounded-lg bg-boutique-ink px-4 py-3 text-sm font-semibold text-white">
              Добави категория
            </button>
          </div>
          <label className="text-sm font-medium text-boutique-ink lg:col-span-4">
            Описание
            <textarea
              name={adminFormFields.blogCategory.description}
              rows={2}
              className={`${adminFieldClass} resize-y`}
            />
          </label>
        </form>
      </article>

      <article className={adminPanelClass}>
        <h3 className="font-heading text-xl text-boutique-ink">Съществуващи категории</h3>
        {categories.length ? (
          <div className="mt-5 space-y-4">
            {categories.map((category) => (
              <AdminSectionAccordion
                key={category.id}
                title={`${category.name}${category.is_active ? "" : " (неактивна)"}`}
                countLabel={category.slug}
              >
                <form action={updateBlogCategory} className="grid gap-3 lg:grid-cols-2">
                  <input
                    type="hidden"
                    name={adminFormFields.blogCategory.id}
                    value={category.id}
                  />
                  <label className="text-sm font-medium text-boutique-ink">
                    Име
                    <input
                      name={adminFormFields.blogCategory.name}
                      defaultValue={category.name}
                      required
                      className={adminFieldClass}
                    />
                  </label>
                  <label className="text-sm font-medium text-boutique-ink">
                    Slug
                    <input
                      name={adminFormFields.blogCategory.slug}
                      defaultValue={category.slug}
                      required
                      className={adminFieldClass}
                    />
                  </label>
                  <label className="text-sm font-medium text-boutique-ink">
                    Подредба
                    <input
                      name={adminFormFields.blogCategory.sortOrder}
                      type="number"
                      defaultValue={category.sort_order}
                      className={adminFieldClass}
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 self-end text-sm">
                    <input
                      name={adminFormFields.blogCategory.isActive}
                      type="checkbox"
                      defaultChecked={category.is_active}
                    />
                    Активна
                  </label>
                  <label className="text-sm font-medium text-boutique-ink lg:col-span-2">
                    Описание
                    <textarea
                      name={adminFormFields.blogCategory.description}
                      defaultValue={category.description ?? ""}
                      rows={+2}
                      className={`${adminFieldClass} resize-y`}
                    />
                  </label>
                  <div className="flex flex-wrap gap-3 lg:col-span-2">
                    <button className="rounded-lg bg-boutique-ink px-4 py-2 text-sm font-semibold text-white">
                      Запази
                    </button>
                  </div>
                </form>
                {category.is_active ? (
                  <form action={deactivateBlogCategory} className="mt-3">
                    <input
                      type="hidden"
                      name={adminFormFields.blogCategory.id}
                      value={category.id}
                    />
                    <button className="text-sm font-semibold text-red-700">
                      Деактивирай
                    </button>
                  </form>
                ) : null}
              </AdminSectionAccordion>
            ))}
          </div>
        ) : (
          <p className={`${adminHelperClass} mt-4`}>Все още няма блог категории.</p>
        )}

        {categories.length ? (
          <table className="mt-8 hidden w-full text-left text-sm">
            <thead className={adminTableHeadClass}>
              <tr>
                <th>Име</th>
                <th>Slug</th>
                <th>Подредба</th>
                <th>Статус</th>
              </tr>
            </thead>
          </table>
        ) : null}
      </article>
    </div>
  );
}
