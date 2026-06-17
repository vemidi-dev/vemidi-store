import Image from "next/image";
import Link from "next/link";

import { HeaderActions } from "@/components/layout/header-actions";
import { HeaderNavigation } from "@/components/layout/header-navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PageContainer } from "@/components/layout/page-container";
import { SocialLinks } from "@/components/layout/social-links";
import {
  buildOccasionCategoryNavItems,
  buildProductCategoryNavItems,
} from "@/lib/category-navigation";
import { getSiteContent } from "@/lib/content/site-content";
import { getStorefrontCategories } from "@/lib/storefront/repository";

export async function Header() {
  const [content, categories] = await Promise.all([
    getSiteContent(),
    getStorefrontCategories(),
  ]);
  const productCategoryItems = buildProductCategoryNavItems(categories);
  const occasionCategoryItems = buildOccasionCategoryNavItems(categories);

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
              width={480}
              height={573}
              className="h-12 w-10 shrink-0 object-contain transition-opacity duration-200 group-hover:opacity-80 sm:h-14 sm:w-12"
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
            <HeaderNavigation
              productCategoryItems={productCategoryItems}
              occasionCategoryItems={occasionCategoryItems}
              interactionMode="hover"
            />
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden 2xl:block">
              <SocialLinks
                networks={["instagram", "facebook", "tiktok"]}
                showHeading={false}
              />
            </div>
            <HeaderActions />
            <MobileNav
              productCategoryItems={productCategoryItems}
              occasionCategoryItems={occasionCategoryItems}
            />
          </div>
        </div>
      </PageContainer>

      <nav
        aria-label="Мобилна навигация"
        className="hidden border-t border-boutique-line/50 bg-white px-5 py-3.5 md:block xl:hidden"
      >
        <HeaderNavigation
          productCategoryItems={productCategoryItems}
          occasionCategoryItems={occasionCategoryItems}
          interactionMode="hover"
          className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-6 gap-y-3"
        />
      </nav>
    </header>
    </div>
  );
}
