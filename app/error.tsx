"use client";

import Link from "next/link";
import { useEffect } from "react";

import { PageContainer } from "@/components/layout/page-container";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="py-20">
      <PageContainer>
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-boutique-paper px-8 py-14 text-center shadow-boutique-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
            Възникна проблем
          </p>
          <h1 className="mt-4 font-heading text-4xl text-boutique-ink">
            Страницата не можа да се зареди
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-boutique-muted">
            Моля, опитайте отново. Ако проблемът продължи, върнете се към продуктите.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-boutique-ink px-7 py-3 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
            >
              Опитай отново
            </button>
            <Link
              href="/producti"
              className="rounded-full border border-boutique-line px-7 py-3 text-sm font-semibold text-boutique-ink transition hover:border-boutique-accent"
            >
              Към продуктите
            </Link>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
