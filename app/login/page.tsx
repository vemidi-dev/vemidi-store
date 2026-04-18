import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
export default function LoginPage() {
  return (
    <section className="pb-24 pt-8 md:pt-12">
      <PageContainer>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
            Информация
          </p>
          <h1 className="font-heading mt-5 text-4xl tracking-tight text-boutique-ink sm:text-5xl">
            Входът и регистрацията са изключени
          </h1>
          <p className="mt-5 text-base leading-relaxed text-boutique-muted">
            Формите за вход и регистрация са премахнати от магазина. Може да продължите директно
            към продуктите и количката.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-boutique-line bg-boutique-paper p-8 text-center shadow-boutique-sm">
          <p className="text-sm leading-relaxed text-boutique-muted">
            Ако искате да пазарувате, изберете продукт и го добавете в количката.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/products"
              className="rounded-full bg-boutique-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
            >
              Към продуктите
            </Link>
            <Link
              href="/cart"
              className="rounded-full border border-boutique-line px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
            >
              Към количката
            </Link>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
