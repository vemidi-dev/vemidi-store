import Image from "next/image";
import Link from "next/link";

import { MobileNav } from "@/components/layout/mobile-nav";
import { NavCartLink } from "@/components/layout/nav-cart-link";
import { PageContainer } from "@/components/layout/page-container";
import { siteConfig } from "@/config/site";

const navLinkClass =
  "relative rounded-sm text-sm font-medium text-boutique-muted transition-colors duration-200 after:pointer-events-none after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-boutique-rose-deep after:transition-transform after:duration-300 hover:text-boutique-rose-deep hover:after:scale-x-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-boutique-rose-deep";

export async function Header() {
  return (
    <div className="sticky top-0 z-50 shadow-[0_1px_0_rgb(44_40_37_/0.05)]">
      <header className="border-b border-boutique-line/70 bg-white/95 backdrop-blur-sm">
      <PageContainer>
        <div className="flex items-center justify-between gap-6 py-3.5">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-3 rounded-lg pr-2 transition-colors duration-200"
          >
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-boutique-rose/25 bg-boutique-paper transition-colors duration-200 group-hover:border-boutique-rose-deep/40">
              <Image
                src="/logo-vemidi.svg"
                alt="VeMiDi crafts logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </span>
            <span className="leading-tight">
              <span className="block font-heading text-lg tracking-tight text-boutique-ink transition-colors duration-200 group-hover:text-boutique-rose-deep sm:text-xl">
                VeMiDi crafts
              </span>
              <span className="mt-0.5 block text-[0.68rem] font-medium uppercase tracking-[0.18em] text-boutique-muted">
                Подари ми спомен
              </span>
            </span>
          </Link>

          <nav aria-label="Основна навигация" className="hidden flex-1 justify-center xl:flex">
            <ul className="flex items-center gap-6">
              {siteConfig.navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={navLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <NavCartLink />
              </li>
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/shop"
              className="rounded-lg border border-boutique-rose-deep/25 bg-boutique-rose-deep px-4 py-2 text-xs font-medium text-white transition-colors duration-200 hover:bg-boutique-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boutique-rose-deep"
            >
              Разгледай
            </Link>
            <MobileNav />
          </div>
        </div>
      </PageContainer>

      <nav
        aria-label="Мобилна навигация"
        className="hidden border-t border-boutique-line/50 bg-white px-5 py-3.5 md:block xl:hidden"
      >
        <ul className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-6 gap-y-3">
          {siteConfig.navigation.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={navLinkClass}>
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <NavCartLink />
          </li>
        </ul>
      </nav>
    </header>
    </div>
  );
}
