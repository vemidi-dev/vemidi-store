import {
  adminPanelClass,
  adminTableClass,
  adminTableHeadClass,
  adminTableRowClass,
} from "@/components/admin/styles";
import {
  buildCategorySeoOverviewRow,
  buildProductSeoOverviewRow,
  seoOverviewKindLabel,
  summarizeSeoOverview,
  type SeoOverviewCompleteness,
  type SeoOverviewEntityKind,
  type SeoOverviewRow,
} from "@/lib/admin/seo-overview";
import type { CategoryRow, ProductRow } from "@/lib/admin/types";

type SeoOverviewPanelProps = {
  products: Array<
    Pick<
      ProductRow,
      | "id"
      | "name"
      | "slug"
      | "meta_title"
      | "meta_description"
      | "og_title"
      | "og_description"
    >
  >;
  categories: Array<
    Pick<
      CategoryRow,
      | "id"
      | "name"
      | "slug"
      | "category_type"
      | "meta_title"
      | "meta_description"
      | "og_title"
      | "og_description"
      | "robots_index"
    >
  >;
  productsError?: string | null;
  categoriesError?: string | null;
};

const completenessLabels: Record<SeoOverviewCompleteness, string> = {
  complete: "Пълни",
  partial: "Частични",
  missing: "Липсват",
};

const completenessClass: Record<SeoOverviewCompleteness, string> = {
  complete: "bg-emerald-50 text-emerald-800",
  partial: "bg-amber-50 text-amber-900",
  missing: "bg-rose-50 text-rose-800",
};

const kindOrder: SeoOverviewEntityKind[] = [
  "product",
  "category",
  "occasion",
  "material",
];

function PresenceCell({ present }: { present: boolean }) {
  return (
    <span className={present ? "text-emerald-700" : "text-boutique-muted"}>
      {present ? "Да" : "Не"}
    </span>
  );
}

function SeoOverviewTable({
  title,
  rows,
}: {
  title: string;
  rows: SeoOverviewRow[];
}) {
  if (rows.length === 0) {
    return null;
  }

  const showRobots = rows.some((row) => row.robotsIndexLabel !== null);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="font-heading text-xl text-boutique-ink">{title}</h3>
        <p className="text-xs text-boutique-muted">{rows.length} записа</p>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-boutique-line">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}>
            <tr>
              <th className="px-3 py-2.5">Име</th>
              <th className="px-3 py-2.5">Slug</th>
              <th className="px-3 py-2.5">Meta title</th>
              <th className="px-3 py-2.5">Meta desc</th>
              <th className="px-3 py-2.5">Дължина</th>
              <th className="px-3 py-2.5">OG title</th>
              <th className="px-3 py-2.5">OG desc</th>
              {showRobots ? (
                <th className="px-3 py-2.5">Robots</th>
              ) : null}
              <th className="px-3 py-2.5">Статус</th>
              <th className="px-3 py-2.5">Редакция</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.kind}-${row.id}`} className={adminTableRowClass}>
                <td className="px-3 py-2.5 font-medium text-boutique-ink">
                  {row.name}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-boutique-muted">
                  {row.slug}
                </td>
                <td className="px-3 py-2.5">
                  <PresenceCell present={row.metaTitlePresent} />
                </td>
                <td className="px-3 py-2.5">
                  <PresenceCell present={row.metaDescriptionPresent} />
                </td>
                <td className="px-3 py-2.5 tabular-nums text-boutique-muted">
                  {row.metaDescriptionLength}
                </td>
                <td className="px-3 py-2.5">
                  <PresenceCell present={row.ogTitlePresent} />
                </td>
                <td className="px-3 py-2.5">
                  <PresenceCell present={row.ogDescriptionPresent} />
                </td>
                {showRobots ? (
                  <td className="px-3 py-2.5 text-boutique-muted">
                    {row.robotsIndexLabel ?? "—"}
                  </td>
                ) : null}
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${completenessClass[row.completeness]}`}
                  >
                    {completenessLabels[row.completeness]}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <a
                    href={row.editHref}
                    className="text-xs font-semibold uppercase tracking-wider text-boutique-accent hover:underline"
                  >
                    Отвори
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SeoOverviewPanel({
  products,
  categories,
  productsError,
  categoriesError,
}: SeoOverviewPanelProps) {
  const productRows = products.map(buildProductSeoOverviewRow);
  const categoryRows = categories.map(buildCategorySeoOverviewRow);
  const allRows = [...productRows, ...categoryRows];
  const summary = summarizeSeoOverview(allRows);

  const grouped = kindOrder.map((kind) => ({
    kind,
    title: seoOverviewKindLabel(kind),
    rows: allRows
      .filter((row) => row.kind === kind)
      .sort((a, b) => a.name.localeCompare(b.name, "bg")),
  }));

  const summaryCards = [
    ["Общо", summary.total],
    ["Пълни meta/OG", summary.complete],
    ["Частични", summary.partial],
    ["Без meta полета", summary.missing],
    ["Без meta title", summary.missingMetaTitle],
    ["Без meta description", summary.missingMetaDescription],
  ] as const;

  return (
    <div className="space-y-6">
      <section className={adminPanelClass}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-accent">
            SEO
          </p>
          <h2 className="mt-2 font-heading text-3xl text-boutique-ink">
            SEO overview
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-boutique-muted">
            Преглед на съществуващите meta/OG полета за продукти, категории и поводи.
            Редакцията става в съществуващите форми — тук няма отделен save flow и не се
            изискват нови DB колони.
          </p>
        </div>

        {(productsError || categoriesError) && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {productsError
              ? `Продуктите не могат да бъдат заредени: ${productsError}`
              : null}
            {productsError && categoriesError ? " " : null}
            {categoriesError
              ? `Категориите не могат да бъдат заредени: ${categoriesError}`
              : null}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {summaryCards.map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-boutique-line bg-boutique-bg p-3"
            >
              <p className="text-xs text-boutique-muted">{label}</p>
              <p className="mt-1 font-heading text-2xl text-boutique-ink">{value}</p>
            </div>
          ))}
        </div>

        {allRows.length === 0 && !productsError && !categoriesError ? (
          <p className="mt-8 text-sm text-boutique-muted">
            Няма продукти или категории за SEO преглед.
          </p>
        ) : null}

        {grouped.map((group) => (
          <SeoOverviewTable
            key={group.kind}
            title={group.title}
            rows={group.rows}
          />
        ))}
      </section>
    </div>
  );
}
