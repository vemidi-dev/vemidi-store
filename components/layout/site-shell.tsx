import { Suspense, type ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

type SiteShellProps = {
  children: ReactNode;
};

function HeaderFallback() {
  return (
    <div className="sticky top-0 z-50">
      <div className="h-9 border-b border-white/10 bg-boutique-sage/90" aria-hidden />
      <header className="border-b border-boutique-line/70 bg-boutique-bg/95">
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center px-5 sm:px-8 md:h-[4.75rem]">
          <div className="h-6 w-40 animate-pulse rounded bg-boutique-line/60" aria-hidden />
        </div>
      </header>
    </div>
  );
}

/**
 * Must stay a synchronous Server Component so it can sit inside `CartProvider` in the root layout.
 * `Header` is async and wrapped in `Suspense` for a valid RSC boundary.
 */
export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
