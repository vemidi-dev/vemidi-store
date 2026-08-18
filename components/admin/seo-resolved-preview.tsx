import { adminHelperClass } from "@/components/admin/styles";
import type { ResolvedSeoPreview } from "@/lib/admin/seo-resolved-preview";

type SeoResolvedPreviewProps = {
  preview: ResolvedSeoPreview;
  className?: string;
};

export function SeoResolvedPreview({
  preview,
  className = "mt-4",
}: SeoResolvedPreviewProps) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Resolved meta title", value: preview.metaTitle },
    { label: "Resolved meta description", value: preview.metaDescription },
    { label: "Resolved OG title", value: preview.ogTitle },
    { label: "Resolved OG description", value: preview.ogDescription },
  ];

  return (
    <div
      className={`rounded-xl border border-dashed border-boutique-line bg-boutique-bg/60 p-4 ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
        Resolved preview
      </p>
      <p className={`${adminHelperClass} mt-1`}>
        Стойностите по-долу следват същите fallback правила като storefront. Празните
        admin полета не чупят SEO — ползва се име/описание или композиран текст.
      </p>

      <dl className="mt-3 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-semibold text-boutique-ink">{row.label}</dt>
            <dd className="mt-1 text-sm leading-6 text-boutique-muted break-words">
              {row.value || "—"}
            </dd>
          </div>
        ))}
      </dl>

      <p className={`${adminHelperClass} mt-4 border-t border-boutique-line/70 pt-3`}>
        Document title (layout template):{" "}
        <span className="font-mono text-boutique-ink">
          {preview.documentTitlePreview}
        </span>
        <span className="mt-1 block">
          Layout template добавя суфикс{" "}
          <span className="font-mono text-boutique-ink">
            {preview.documentTitleNote}
          </span>
          .
        </span>
      </p>
    </div>
  );
}
