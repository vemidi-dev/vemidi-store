import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";

const panelClass =
  "rounded-2xl border border-boutique-line bg-boutique-paper p-8 shadow-boutique-sm md:p-10";

export default async function CheckoutPage() {
  return (
    <div>
      <PageHero
        eyebrow="Поръчка"
        title="Финализиране на поръчката"
        description="Страницата е подготвена за финална интеграция на адрес, доставка и плащане."
      />
      <section className="pb-24 pt-4">
        <PageContainer>
          <div className={panelClass}>
            <p className="text-sm font-medium text-boutique-ink">Поръчката се изпълнява като гост.</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-boutique-muted">
              За следваща стъпка може да свържете тази страница с реални полета за адрес, метод за
              доставка и плащане. Количката и персонализацията остават достъпни от страницата на
              количката.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cart"
                className="rounded-full border border-boutique-line px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
              >
                Назад към количката
              </Link>
              <Link
                href="/products"
                className="rounded-full bg-boutique-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
              >
                Продължи пазаруването
              </Link>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
