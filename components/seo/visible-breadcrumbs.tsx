import Link from "next/link";

import type { BreadcrumbItem } from "@/lib/seo/breadcrumbs";

type VisibleBreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function VisibleBreadcrumbs({ items, className }: VisibleBreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  const lastIndex = items.length - 1;

  return (
    <nav aria-label="Навигационна пътека" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-[0.18em] text-boutique-sage-deep">
        {items.map((item, index) => (
          <li key={`${item.path}::${item.name}`} className="flex items-center gap-2">
            {index > 0 ? (
              <span className="text-boutique-muted/70" aria-hidden>
                ›
              </span>
            ) : null}
            {index === lastIndex ? (
              <span
                aria-current="page"
                className="text-boutique-muted normal-case tracking-normal"
              >
                {item.name}
              </span>
            ) : (
              <Link
                href={item.path}
                className="transition hover:text-boutique-accent hover:underline"
              >
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
