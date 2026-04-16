import { Suspense, type ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

type SiteShellProps = {
  children: ReactNode;
};

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-50 border-b border-boutique-line/70 bg-[#F7F3EF]/95">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center px-5 sm:px-8 md:h-[4.75rem]">
        <div className="h-6 w-40 animate-pulse rounded bg-boutique-line/60" aria-hidden />
      </div>
    </header>
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
