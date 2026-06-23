"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type BoutiquePageEnterProps = {
  children: ReactNode;
};

export function BoutiquePageEnter({ children }: BoutiquePageEnterProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="boutique-page-enter">
      {children}
    </div>
  );
}
