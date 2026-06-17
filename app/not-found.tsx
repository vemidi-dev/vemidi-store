import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { notFoundPageMetadata } from "@/lib/seo/page-metadata";

export const metadata = notFoundPageMetadata;

export default function NotFound() {
  return (
    <section className="py-20">
      <PageContainer>
        <div className="mx-auto max-w-2xl rounded-2xl border border-boutique-line bg-boutique-paper px-8 py-14 text-center shadow-boutique-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
            Страница 404
          </p>
          <h1 className="mt-4 font-heading text-4xl text-boutique-ink">
            Тази страница не е намерена
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-boutique-muted">
            Адресът може да е променен или съдържанието вече да не е достъпно.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-boutique-ink px-7 py-3 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
            >
              Към началото
            </Link>
            <Link
              href="/producti"
              className="rounded-full border border-boutique-line px-7 py-3 text-sm font-semibold text-boutique-ink transition hover:border-boutique-accent"
            >
              Разгледай продуктите
            </Link>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
