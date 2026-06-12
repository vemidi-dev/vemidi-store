import Image from "next/image";
import Link from "next/link";

import { HeaderActions } from "@/components/layout/header-actions";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PageContainer } from "@/components/layout/page-container";
import { SocialLinks } from "@/components/layout/social-links";
import { siteConfig } from "@/config/site";
import { getSiteContent } from "@/lib/content/site-content";

const navLinkClass =
  "relative whitespace-nowrap rounded-sm text-sm font-medium text-boutique-muted transition-colors duration-200 after:pointer-events-none after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-boutique-rose-deep after:transition-transform after:duration-300 hover:text-boutique-rose-deep hover:after:scale-x-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-boutique-rose-deep";

export async function Header() {
  const content = await getSiteContent();

  return (
    <div className="sticky top-0 z-50 shadow-[0_1px_0_rgb(44_40_37_/0.05)]">
      <header className="border-b border-boutique-line/70 bg-white/95 backdrop-blur-sm">
      <PageContainer className="max-w-[90rem]">
        <div className="flex items-center justify-between gap-2 py-3.5 sm:gap-6">
          <Link
            href="/"
            className="group flex min-w-0 shrink items-center gap-2 rounded-lg pr-1 transition-colors duration-200 sm:shrink-0 sm:gap-3 sm:pr-2"
          >
            <Image
              src="/assets/logo-transparent-color.png"
              alt="VeMiDi crafts logo"
              width={96}
              height={96}
              priority
              className="h-12 w-12 shrink-0 scale-[1.65] object-contain transition-transform duration-200 group-hover:scale-[1.72] sm:h-14 sm:w-14"
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-heading text-base tracking-tight text-boutique-ink transition-colors duration-200 group-hover:text-boutique-rose-deep sm:text-xl">
                VeMiDi crafts
              </span>
              <span className="mt-0.5 hidden text-[0.68rem] font-medium uppercase tracking-[0.18em] text-boutique-muted min-[390px]:block">
                {content["header.tagline"]}
              </span>
            </span>
          </Link>

          <nav aria-label="Основна навигация" className="hidden flex-1 justify-center xl:flex">
            <ul className="flex items-center gap-4 2xl:gap-5">
              {siteConfig.navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={navLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden 2xl:block">
              <SocialLinks
                networks={["instagram", "facebook", "tiktok"]}
                showHeading={false}
              />
            </div>
            <HeaderActions />
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
        </ul>
      </nav>
    </header>
    </div>
  );
}
