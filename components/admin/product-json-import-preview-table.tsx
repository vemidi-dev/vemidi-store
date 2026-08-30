import type { ProductImportPreview } from "@/lib/admin/product-json-import-v2/types";

import { adminTableClass, adminTableHeadClass, adminTableRowClass } from "@/components/admin/styles";

const statusLabels = {
  ready: "Готов",
  warning: "Предупреждение",
  error: "Грешка",
} as const;

const statusClassNames = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-800",
} as const;

function formatPrice(price: number) {
  return `${price.toFixed(2)} €`;
}

function formatCategories(categorySlugs: string[], primaryCategorySlug: string) {
  if (categorySlugs.length === 0) {
    return "—";
  }

  return categorySlugs
    .map((slug) => (slug === primaryCategorySlug ? `${slug} (основна)` : slug))
    .join(", ");
}

type ProductJsonImportPreviewTableProps = {
  previews: ProductImportPreview[];
};

export function ProductJsonImportPreviewTable({
  previews,
}: ProductJsonImportPreviewTableProps) {
  if (previews.length === 0) {
    return (
      <p className="text-sm text-boutique-muted">Няма продукти за preview.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-boutique-line">
      <table className={adminTableClass}>
        <thead>
          <tr className={adminTableHeadClass}>
            <th className="px-3 py-2.5">Име</th>
            <th className="px-3 py-2.5">Slug</th>
            <th className="hidden px-3 py-2.5 sm:table-cell">Цена</th>
            <th className="hidden px-3 py-2.5 lg:table-cell">Категории</th>
            <th className="px-3 py-2.5">Снимки</th>
            <th className="px-3 py-2.5">Статус</th>
          </tr>
        </thead>
        <tbody>
          {previews.map((preview) => (
            <tr key={preview.slug} className={adminTableRowClass}>
              <td className="px-3 py-3 align-top">
                <div className="max-w-[12rem] truncate font-medium text-boutique-ink sm:max-w-none">
                  {preview.name}
                </div>
                <div className="mt-1 text-xs text-boutique-muted sm:hidden">
                  {formatPrice(preview.price)} · {preview.imageCount} снимки
                </div>
                {preview.errors.length > 0 || preview.warnings.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs leading-relaxed">
                    {preview.errors.map((issue) => (
                      <li key={`${preview.slug}-error-${issue.code}`} className="text-red-700">
                        {issue.message}
                      </li>
                    ))}
                    {preview.warnings.map((issue) => (
                      <li key={`${preview.slug}-warn-${issue.code}`} className="text-amber-800">
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </td>
              <td className="px-3 py-3 align-top font-mono text-xs text-boutique-muted">
                {preview.slug}
              </td>
              <td className="hidden px-3 py-3 align-top sm:table-cell">
                {formatPrice(preview.price)}
              </td>
              <td className="hidden max-w-[14rem] px-3 py-3 align-top text-xs text-boutique-muted lg:table-cell">
                {formatCategories(preview.categorySlugs, preview.primaryCategorySlug)}
              </td>
              <td className="px-3 py-3 align-top text-sm">{preview.imageCount}</td>
              <td className="px-3 py-3 align-top">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClassNames[preview.status]}`}
                >
                  {statusLabels[preview.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
