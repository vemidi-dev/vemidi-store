"use client";

import type { ReactNode } from "react";

type AdminOpenDetailsButtonProps = {
  detailsId: string;
  children: ReactNode;
  className?: string;
};

export function AdminOpenDetailsButton({
  detailsId,
  children,
  className = "",
}: AdminOpenDetailsButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const element = document.getElementById(detailsId);
        if (element instanceof HTMLDetailsElement) {
          element.open = true;
          element.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }}
    >
      {children}
    </button>
  );
}
