import Image from "next/image";
import Link from "next/link";

import type { SiteContent } from "@/lib/content/site-content";

export function HomeHero({ content }: { content: SiteContent }) {
  const quickPaths = [
    {
      href: "/occasions",
      icon: "♡",
      title: content["home.quick_occasions"],
    },
    {
      href: "/categories",
      icon: "◇",
      title: content["home.quick_categories"],
    },
    {
      href: "/shop?personalization=only#product-grid",
      icon: "✎",
      title: content["home.quick_personalized"],
    },
    {
      href: "/events",
      icon: "✦",
      title: content["home.quick_events"],
    },
  ];

  return (
    <section className="overflow-hidden border-b border-boutique-line bg-boutique-paper">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="order-2 flex items-center bg-[linear-gradient(135deg,#fdfcfa_0%,#ebe4db_100%)] lg:order-1">
          <div className="w-full px-5 py-8 sm:px-10 sm:py-12 lg:ml-auto lg:max-w-[36rem] lg:px-12 lg:py-16">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-boutique-rose-deep">
              ♡ {content["home.hero_eyebrow"]}
            </p>
            <h1 className="mt-3 font-heading text-[2.35rem] leading-[0.98] tracking-tight text-boutique-ink sm:mt-5 sm:text-6xl">
              {content["home.hero_title_line_1"]}
              <span className="block">
                {content["home.hero_title_line_2"]}
              </span>
              <span className="mt-2 block text-[0.82em] italic text-boutique-rose-deep">
                {content["home.hero_title_accent"]}
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-boutique-muted sm:mt-6 sm:text-base sm:leading-7">
              {content["home.hero_description"]}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-8 sm:grid-cols-4 sm:gap-3">
              {quickPaths.map((item) => (
                <Link
                  className="group flex min-h-16 items-center gap-2 rounded-lg border border-boutique-rose/25 bg-white/70 px-3 py-2.5 text-left shadow-boutique-sm transition hover:-translate-y-1 hover:border-boutique-rose-deep/40 hover:bg-white sm:min-h-28 sm:block sm:rounded-xl sm:p-4 sm:text-center"
                  href={item.href}
                  key={item.href}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-boutique-blush text-base text-boutique-rose-deep sm:mx-auto sm:h-9 sm:w-9 sm:text-lg">
                    {item.icon}
                  </span>
                  <span className="block text-[0.68rem] font-semibold leading-snug text-boutique-ink sm:mt-3 sm:text-xs">
                    {item.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="relative order-1 min-h-[16rem] overflow-hidden sm:min-h-[22rem] lg:order-2 lg:min-h-[38rem]">
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
