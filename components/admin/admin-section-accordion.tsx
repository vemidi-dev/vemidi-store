import type { ReactNode } from "react";

import { adminAccordionClass, adminAccordionSummaryClass } from "@/components/admin/styles";

type AdminSectionAccordionProps = {
  title: string;
  countLabel: string;
  children: ReactNode;
  className?: string;
  trailing?: ReactNode;
};

export function AdminSectionAccordion({
  title,
  countLabel,
  children,
  className = "",
  trailing,
}: AdminSectionAccordionProps) {
  return (
    <details className={[adminAccordionClass, className].filter(Boolean).join(" ")}>
      <summary
        className={adminAccordionSummaryClass}
        aria-label={`${title} — ${countLabel}`}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-heading text-lg text-boutique-ink">{title}</span>
          <span className="text-sm font-normal text-boutique-muted" aria-hidden>
            {countLabel}
          </span>
        </span>
        {trailing ? <span className="shrink-0">{trailing}</span> : null}
      </summary>
      <div className="border-t border-boutique-line/80 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        {children}
      </div>
    </details>
  );
}
