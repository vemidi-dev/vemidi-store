import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-boutique-sage-deep/30 bg-boutique-sage-deep text-boutique-on-sage">
      <PageContainer className="grid gap-12 py-14 md:grid-cols-[1.4fr_0.8fr_0.8fr] md:py-16">
        <div className="space-y-4">
          <p className="font-heading text-2xl text-boutique-paper">{siteConfig.name}</p>
          <p className="max-w-md text-sm leading-relaxed text-boutique-on-sage/85">
            Подаръци, декорации и творчески комплекти, изработени на ръка с лично отношение.
            Създаваме малки серии и персонални изделия, които пазят спомен.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-boutique-on-sage/55">
            Магазин
          </p>
          <div className="flex flex-col gap-3">
            {siteConfig.footerLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-boutique-on-sage/90 transition hover:text-boutique-on-sage"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/blog"
              className="text-sm text-boutique-on-sage/90 transition hover:text-boutique-on-sage"
            >
              Блог
            </Link>
            <Link
              href="/events"
              className="text-sm text-boutique-on-sage/90 transition hover:text-boutique-on-sage"
            >
              Събития
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-boutique-on-sage/55">
            Поръчка
          </p>
          <p className="text-sm leading-relaxed text-boutique-on-sage/85">
            Изберете продукт, добавете желаната персонализация и го поставете в количката.
          </p>
          <Link
            href="/cart"
            className="inline-flex text-sm font-semibold text-boutique-paper underline-offset-4 hover:underline"
          >
            Към количката
          </Link>
          <div className="flex flex-col gap-2 pt-2 text-sm">
            <Link href="/delivery" className="text-boutique-on-sage/80 hover:text-boutique-paper">
              Доставка и плащане
            </Link>
            <Link href="/terms" className="text-boutique-on-sage/80 hover:text-boutique-paper">
              Условия за поръчка
            </Link>
            <Link href="/privacy" className="text-boutique-on-sage/80 hover:text-boutique-paper">
              Поверителност
            </Link>
          </div>
        </div>
      </PageContainer>

      <div className="border-t border-white/10">
        <PageContainer className="py-5 text-center text-xs text-boutique-on-sage/50">
          © {new Date().getFullYear()} {siteConfig.name}. Всички права запазени.
        </PageContainer>
      </div>
    </footer>
  );
}
