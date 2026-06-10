import Image from "next/image";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";

const benefits = [
  {
    title: "Ръчна изработка",
    text: "С внимание към детайла",
    icon: "♧",
  },
  {
    title: "Персонализация",
    text: "С име, дата и послание",
    icon: "♡",
  },
  {
    title: "Бърза изработка",
    text: "Срокът е описан към продукта",
    icon: "▱",
  },
  {
    title: "Качествени материали",
    text: "Подбрани за красив завършек",
    icon: "♢",
  },
];

export function HomeBenefits() {
  return (
    <section className="border-b border-boutique-line bg-boutique-paper">
      <PageContainer className="grid grid-cols-2 gap-y-7 py-8 md:grid-cols-4">
        {benefits.map((benefit, index) => (
          <article
            key={benefit.title}
            className={`flex items-center gap-3 px-2 md:px-5 ${
              index > 0 ? "md:border-l md:border-boutique-line" : ""
            }`}
          >
            <span className="text-2xl text-boutique-rose-deep">{benefit.icon}</span>
            <div>
              <p className="text-sm font-semibold text-boutique-ink">{benefit.title}</p>
              <p className="mt-1 text-xs text-boutique-muted">{benefit.text}</p>
            </div>
          </article>
        ))}
      </PageContainer>
    </section>
  );
}

export function HomeProcess() {
  const steps = [
    "Избери продукт",
    "Добави персонализация",
    "Потвърди поръчката",
  ];

  return (
    <section className="border-y border-boutique-line bg-boutique-paper py-8 md:py-10">
      <PageContainer>
        <h2 className="text-center font-heading text-2xl text-boutique-ink md:text-[1.75rem]">
          Как да поръчам
        </h2>

        <ol className="mx-auto mt-6 grid max-w-3xl gap-3 md:mt-7 md:grid-cols-3 md:gap-5">
          {steps.map((title, index) => (
            <li
              key={title}
              className="flex items-center gap-3 rounded-xl border border-boutique-line/80 bg-white px-4 py-3 md:flex-col md:gap-2.5 md:border-0 md:bg-transparent md:px-2 md:py-0 md:text-center"
            >
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-boutique-sage/35 bg-boutique-paper font-heading text-sm text-boutique-sage-deep"
              >
                {index + 1}
              </span>
              <p className="text-sm font-medium leading-snug text-boutique-ink">
                {title}
              </p>
            </li>
          ))}
        </ol>

        <p className="mx-auto mt-5 max-w-xl text-center text-sm leading-relaxed text-boutique-muted md:mt-6">
          След поръчката ще се свържем с вас за потвърждение на детайлите и срока за
          изработка.
        </p>
      </PageContainer>
    </section>
  );
}

export function HomeAtelier() {
  return (
    <section className="border-b border-boutique-line bg-boutique-blush/40">
      <div className="grid lg:grid-cols-2">
        <div className="relative min-h-[22rem] overflow-hidden lg:min-h-[30rem]">
          <Image
            src="/assets/home-atelier.webp"
            alt="Опаковане на ръчно изработени подаръци в ателието на VeMiDi"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="flex items-center px-7 py-14 sm:px-12 lg:px-16">
          <div className="max-w-lg">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-boutique-rose-deep">
            ♡ Създадено с любов
          </p>
          <h2 className="mt-4 font-heading text-3xl leading-tight text-boutique-ink sm:text-4xl">
            Малки детайли,
            <span className="block italic text-boutique-rose-deep">голямо значение</span>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-boutique-muted">
            Всеки подарък от VeMiDi crafts е създаден, за да предаде емоция, благодарност и
            обич. Вярваме, че най-хубавите подаръци са тези, които идват от сърцето.
          </p>
          <Link
            href="/about"
            className="mt-8 inline-flex rounded-lg bg-boutique-rose-deep px-6 py-3 text-sm font-semibold text-white transition hover:bg-boutique-ink"
          >
            Научи повече за нас
          </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
