import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-boutique-line bg-boutique-paper">
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-boutique-sage/10 blur-3xl"
        aria-hidden
      />
      <PageContainer className="relative grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20 lg:py-24">
        <div className="order-2 space-y-8 lg:order-1">
          <div className="space-y-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-boutique-sage-deep">
              Ръчна изработка · Личен подарък
            </p>
            <h1 className="font-heading text-[2.6rem] leading-[1.05] tracking-tight text-boutique-ink sm:text-5xl lg:text-6xl">
              Подаръци, които носят лично послание
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-boutique-muted sm:text-lg">
              Създаваме персонализирани изделия, декорации и творчески комплекти за хората и
              моментите, които заслужават да останат в спомените.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-boutique-ink px-8 py-3 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
            >
              Разгледай магазина
            </Link>
            <Link
              href="/categories"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-boutique-line bg-boutique-bg px-8 py-3 text-sm font-semibold text-boutique-ink transition hover:border-boutique-accent/50"
            >
              Избери категория
            </Link>
          </div>

          <div className="grid max-w-xl grid-cols-3 gap-3 border-t border-boutique-line pt-6 text-center sm:text-left">
            {[
              ["01", "Избор"],
              ["02", "Персонализация"],
              ["03", "Изработка"],
            ].map(([number, label]) => (
              <div key={number}>
                <p className="font-heading text-xl text-boutique-accent">{number}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-boutique-line shadow-boutique">
            <MediaPlaceholder label="Основна снимка за началната страница" />
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
