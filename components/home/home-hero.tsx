import Image from "next/image";
import Link from "next/link";

export function HomeHero() {
  return (
    <section className="overflow-hidden border-b border-boutique-line bg-boutique-paper">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="order-2 flex items-center bg-[linear-gradient(135deg,#fdfcfa_0%,#ebe4db_100%)] lg:order-1">
          <div className="w-full px-6 py-12 sm:px-10 lg:ml-auto lg:max-w-[36rem] lg:px-12 lg:py-16">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-boutique-rose-deep">
              ♡ Персонализирани подаръци със сърце
            </p>
            <h1 className="mt-5 font-heading text-[2.8rem] leading-[0.98] tracking-tight text-boutique-ink sm:text-6xl">
              Подаръци,
              <span className="block">които носят</span>
              <span className="mt-2 block text-[0.82em] italic text-boutique-rose-deep">
                лично послание
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-boutique-muted sm:text-base">
              Ръчно изработени подаръци, декорации и творчески комплекти за специални моменти
              и любими хора.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickPaths.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group min-h-28 rounded-xl border border-boutique-rose/25 bg-white/70 p-4 text-center shadow-boutique-sm transition hover:-translate-y-1 hover:border-boutique-rose-deep/40 hover:bg-white"
                >
                  <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-boutique-blush text-lg text-boutique-rose-deep">
                    {item.icon}
                  </span>
                  <span className="mt-3 block text-xs font-semibold leading-snug text-boutique-ink">
                    {item.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="relative order-1 min-h-[22rem] overflow-hidden lg:order-2 lg:min-h-[38rem]">
          <Image
            src="/assets/home-hero.webp"
            alt="Персонализиран дървен подарък за кръщене"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

const quickPaths = [
  {
    href: "/occasions",
    icon: "♡",
    title: "Търся подарък за повод",
  },
  {
    href: "/categories",
    icon: "◇",
    title: "Изберете продукт",
  },
  {
    href: "/shop?personalization=only#product-grid",
    icon: "✎",
    title: "Искам персонализиран подарък",
  },
  {
    href: "/events",
    icon: "✦",
    title: "Творчески събития",
  },
];

export function HomeQuickPaths() {
  return null;
}
