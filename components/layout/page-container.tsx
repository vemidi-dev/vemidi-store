import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Centered boutique content width — consistent across pages.
 */
export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={["mx-auto w-full max-w-6xl px-5 sm:px-8", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
