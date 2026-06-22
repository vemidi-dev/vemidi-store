import Image from "next/image";
import Link from "next/link";

import type { SiteContent } from "@/lib/content/site-content";
import { CATEGORY_INDEX_PATH, OCCASION_INDEX_PATH } from "@/lib/category-url";

export function HomeHero({ content }: { content: SiteContent }) {
  const quickPaths = [
    {
      href: OCCASION_INDEX_PATH,
      icon: "♡",
      title: content["home.quick_occasions"],
    },
    {
      href: CATEGORY_INDEX_PATH,
      icon: "◇",
      title: content["home.quick_categories"],
    },
    {
      href: "/producti?personalization=only#product-grid",
      icon: "✎",
      title: content["home.quick_personalized"],
    },
    {
      href: "/sabitiya",
      icon: "✦",
      title: content["home.quick_events"],
    },
  ];

  return (
    <section className="overflow-hidden border-b border-boutique-line bg-boutique-paper">
      <div className="grid lg:min-h-[40rem] lg:grid-cols-2 2xl:min-h-[44rem]">
        <div className="order-2 flex min-w-0 items-center bg-[linear-gradient(135deg,#fdfcfa_0%,#ebe4db_100%)] lg:order-1">
          <div className="w-full px-5 pb-9 pt-10 sm:px-10 sm:pb-12 sm:pt-12 lg:ml-auto lg:max-w-[40rem] lg:px-12 lg:py-20 xl:max-w-[43rem] xl:px-16">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-boutique-rose-deep sm:text-xs">
              ♡ {content["home.hero_eyebrow"]}
            </p>
            <h1 className="mt-4 max-w-[22em] text-balance font-heading font-normal text-[clamp(1.875rem,2.5vw+1.2rem,3.75rem)] leading-[1.08] tracking-[-0.03em] text-boutique-ink sm:mt-5 lg:max-w-[15em] lg:leading-[1.04] xl:max-w-[17em]">
              {content["home.hero_title_line_1"]}
              <span className="block">
                {content["home.hero_title_line_2"]}
              </span>
              <span className="mt-1.5 block font-[Georgia,serif] text-[0.78em] italic leading-[1.12] text-boutique-rose-deep sm:mt-2">
                {content["home.hero_title_accent"]}
              </span>
            </h1>
            <h2 className="mt-5 max-w-[36rem] text-[0.95rem] font-normal leading-7 text-boutique-muted sm:mt-6 sm:text-base lg:text-[1.05rem] lg:leading-8">
              {content["home.hero_description"]}
            </h2>

            <div className="mt-7 grid grid-cols-2 gap-2.5 sm:mt-9 sm:grid-cols-4 sm:gap-3">
              {quickPaths.map((item) => (
                <Link
                  className="group flex min-h-[4.75rem] items-center gap-3 rounded-xl border border-boutique-rose/25 bg-white/80 px-3.5 py-3 text-left shadow-boutique-sm transition hover:-translate-y-1 hover:border-boutique-rose-deep/40 hover:bg-white hover:shadow-boutique sm:min-h-32 sm:flex-col sm:justify-center sm:gap-3 sm:p-4 sm:text-center"
                  href={item.href}
                  key={item.href}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-boutique-blush text-base text-boutique-rose-deep transition group-hover:bg-boutique-sage-deep group-hover:text-boutique-on-sage sm:h-10 sm:w-10 sm:text-lg">
                    {item.icon}
                  </span>
                  <span className="block text-xs font-semibold leading-snug text-boutique-ink sm:text-[0.8rem]">
                    {item.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="relative order-1 min-h-[17rem] overflow-hidden sm:min-h-[22rem] lg:order-2 lg:min-h-full">
          <Image
            alt="Персонализиран дървен подарък за кръщене"
            className="object-cover"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            src="/assets/home-hero.webp"
          />
        </div>
      </div>
    </section>
  );
}

export function HomeQuickPaths() {
  return null;
}
