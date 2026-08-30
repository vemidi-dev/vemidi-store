import Link from "next/link";

import type {
  ProductJsonImportIssue,
  ProductJsonImportSummaryResult,
} from "@/lib/admin/product-json-import-v2/types";

import { adminPanelClass } from "@/components/admin/styles";

type ProductJsonImportSummaryProps = {
  summary: ProductJsonImportSummaryResult;
};

function IssueList({
  title,
  issues,
  tone,
}: {
  title: string;
  issues: ProductJsonImportIssue[];
  tone: "warning" | "error";
}) {
  if (issues.length === 0) {
    return null;
  }

  const toneClass =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed">
        {issues.map((issue, index) => (
          <li key={`${issue.code}-${issue.slug ?? "file"}-${index}`}>
            {issue.slug ? `${issue.slug}: ` : ""}
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductJsonImportSummary({ summary }: ProductJsonImportSummaryProps) {
  return (
    <section className={`${adminPanelClass} space-y-4`}>
      <div>
        <h2 className="font-heading text-2xl text-boutique-ink">Резултат от импорта</h2>
        <p className="mt-1 text-sm text-boutique-muted">
          Създадени: {summary.created.length} · Неуспешни: {summary.failed.length} ·
          Предупреждения: {summary.warnings.length}
        </p>
      </div>

      {summary.created.length > 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-emerald-900">Създадени чернови</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {summary.created.map((entry) => (
              <li key={entry.productId} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-emerald-900">
                  {entry.slug} · {entry.imageCount} снимки
                </span>
                <Link
                  href={entry.editUrl}
                  className="inline-flex w-fit rounded-lg bg-boutique-ink px-3 py-1.5 text-xs font-semibold text-boutique-paper transition hover:bg-boutique-accent"
                >
                  Редакция
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.failed.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-red-900">Неуспешни продукти</h3>
          <ul className="mt-2 space-y-2 text-sm text-red-800">
            {summary.failed.map((entry) => (
              <li key={`${entry.slug}-${entry.stage}`}>
                <span className="font-medium">{entry.slug}</span> ({entry.stage}):{" "}
                {entry.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <IssueList title="Предупреждения" issues={summary.warnings} tone="warning" />
    </section>
  );
}
