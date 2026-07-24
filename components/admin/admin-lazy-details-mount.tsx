"use client";

import { useEffect, useState, type ReactNode } from "react";

type AdminLazyDetailsMountProps = {
  id: string;
  className?: string;
  summaryClassName?: string;
  summary: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  initiallyMounted?: boolean;
};

export function AdminLazyDetailsMount({
  id,
  className,
  summaryClassName,
  summary,
  children,
  contentClassName,
  initiallyMounted = false,
}: AdminLazyDetailsMountProps) {
  const [mounted, setMounted] = useState(initiallyMounted);

  useEffect(() => {
    const details = document.getElementById(id);
    if (!(details instanceof HTMLDetailsElement)) {
      return;
    }

    const syncMounted = () => {
      if (details.open) {
        setMounted(true);
      }
    };

    syncMounted();
    details.addEventListener("toggle", syncMounted);
    return () => details.removeEventListener("toggle", syncMounted);
  }, [id]);

  return (
    <details
      id={id}
      className={className}
      onToggle={(event) => {
        if (event.currentTarget.open) {
          setMounted(true);
        }
      }}
    >
      <summary className={summaryClassName}>{summary}</summary>
      {mounted ? (
        contentClassName ? (
          <div className={contentClassName}>{children}</div>
        ) : (
          children
        )
      ) : null}
    </details>
  );
}
