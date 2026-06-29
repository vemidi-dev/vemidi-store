"use client";

import type { ReactNode } from "react";

type AdminProductEditStickyActionsProps = {
  formId: string;
  detailsId: string;
  productAnchorId: string;
  saveLabel?: string;
  extraActions?: ReactNode;
};

const secondaryButtonClass =
  "rounded-full border border-boutique-line bg-white px-4 py-2 text-xs font-semibold text-boutique-ink transition hover:border-boutique-sage-deep hover:text-boutique-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30";

const primaryButtonClass =
  "rounded-full bg-boutique-ink px-5 py-2 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30";

export function AdminProductEditStickyActions({
  formId,
  detailsId,
  productAnchorId,
  saveLabel = "Запазване",
  extraActions,
}: AdminProductEditStickyActionsProps) {
  const scrollToProductTop = () => {
    document.getElementById(productAnchorId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const closeEdit = () => {
    const details = document.getElementById(detailsId);
    if (details instanceof HTMLDetailsElement) {
      details.open = false;
    }
    scrollToProductTop();
  };

  return (
    <div
      className="sticky bottom-0 z-30 -mx-3 mt-6 border-t border-boutique-line/80 bg-boutique-paper/95 px-3 py-3 shadow-[0_-8px_24px_-12px_rgb(44_40_37_/0.2)] backdrop-blur-sm sm:-mx-4 sm:px-4"
      role="toolbar"
      aria-label="Действия при редакция на продукт"
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={scrollToProductTop} className={secondaryButtonClass}>
          Към началото на продукта
        </button>
        <button type="button" onClick={closeEdit} className={secondaryButtonClass}>
          Затваряне редакцията
        </button>
        {extraActions}
        <button type="submit" form={formId} className={primaryButtonClass}>
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
