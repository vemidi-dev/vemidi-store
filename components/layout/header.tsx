import Image from "next/image";
import Link from "next/link";

import { NavCartLink } from "@/components/layout/nav-cart-link";
import { PageContainer } from "@/components/layout/page-container";
import { TopBar } from "@/components/layout/top-bar";
import { siteConfig } from "@/config/site";

const navLinkClass =
  "relative text-[0.9375rem] font-medium text-boutique-muted transition-colors duration-200 after:pointer-events-none after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-boutique-accent after:transition-transform after:duration-300 hover:text-boutique-ink hover:after:scale-x-100";

export async function Header() {
  return (
    <div className="sticky top-0 z-50 shadow-[0_1px_0_rgb(44_40_37_/0.04)]">
      <TopBar />
      <header className="border-b border-boutique-line/70 bg-boutique-bg/95 backdrop-blur-sm">
      <PageContainer>
        <div className="flex items-center justify-between gap-6 py-4 md:py-5">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-3 rounded-lg pr-2 transition-colors duration-200"
          >
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-boutique-line bg-boutique-paper shadow-[0_1px_2px_rgb(44_40_37_/0.08)] transition-colors duration-200 group-hover:border-boutique-sage/35">
              <Image
                src="/logo-vemidi.svg"
                alt="VeMiDi crafts logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </span>
            <span className="leading-tight">
              <span className="block font-heading text-lg tracking-tight text-boutique-ink transition-colors duration-200 group-hover:text-boutique-accent sm:text-xl">
                VeMiDi crafts
              </span>
              <span className="mt-0.5 block text-[0.68rem] font-medium uppercase tracking-[0.18em] text-boutique-muted">
                Подари ми спомен
              </span>
            </span>
          </Link>

          <nav aria-label="Основна навигация" className="hidden flex-1 justify-center md:flex">
            <ul className="flex items-center gap-10 lg:gap-12">
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
              className="rounded-full border border-boutique-sage-deep/25 bg-boutique-sage-deep px-4 py-2 text-xs font-medium text-boutique-on-sage transition-colors duration-200 hover:bg-boutique-ochre hover:text-boutique-ink"
            >
              Разгледай
            </Link>
          </div>
        </div>
      </PageContainer>

      <nav
        aria-label="Мобилна навигация"
        className="border-t border-boutique-line/50 bg-boutique-bg px-5 py-3.5 md:hidden"
      >
        <ul className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-8 gap-y-3">
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
