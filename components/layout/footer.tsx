import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-boutique-rose/25 bg-[linear-gradient(180deg,#fdfcfa_0%,#ebe4db_100%)] text-boutique-ink">
      <PageContainer className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_0.9fr_0.9fr] md:py-16">
        <div className="space-y-4">
          <p className="font-heading text-2xl text-boutique-ink">{siteConfig.name}</p>
          <p className="max-w-md text-sm leading-relaxed text-boutique-muted">
            Подаръци, декорации и творчески комплекти, изработени на ръка с лично отношение.
            Създаваме малки серии и персонални изделия, които пазят спомен.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-boutique-rose-deep">
            Магазин
          </p>
          <div className="flex flex-col gap-3">
            {siteConfig.footerLinks.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-boutique-muted transition hover:text-boutique-rose-deep">
                {item.label}
              </Link>
            ))}
            <Link href="/blog" className="text-sm text-boutique-muted transition hover:text-boutique-rose-deep">Блог</Link>
            <Link href="/events" className="text-sm text-boutique-muted transition hover:text-boutique-rose-deep">Събития</Link>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-boutique-rose-deep">
            Информация
          </p>
          <div className="flex flex-col gap-3">
            {siteConfig.informationLinks.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-boutique-muted transition hover:text-boutique-rose-deep">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-boutique-rose-deep">
            Контакти
          </p>
          <div className="space-y-2 text-sm leading-relaxed text-boutique-muted">
            <p>{siteConfig.business.legalName}</p>
            <a className="block hover:text-boutique-rose-deep" href={`mailto:${siteConfig.business.email}`}>{siteConfig.business.email}</a>
            <a className="block hover:text-boutique-rose-deep" href={`tel:${siteConfig.business.phoneHref}`}>{siteConfig.business.phoneDisplay}</a>
            <p>{siteConfig.business.address}</p>
          </div>
        </div>
      </PageContainer>

      <div className="border-t border-boutique-rose/20">
        <PageContainer className="py-5 text-center text-xs text-boutique-muted">
          © {new Date().getFullYear()} {siteConfig.name}. Всички права запазени.
        </PageContainer>
      </div>
    </footer>
  );
}
