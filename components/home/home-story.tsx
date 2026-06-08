import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";

const benefits = [
  {
    title: "Ръчна изработка",
    text: "Всеки продукт се подготвя с внимание, а не като част от безлична серийна линия.",
  },
  {
    title: "Лично послание",
    text: "Добавете име, дата, цветове или кратък текст според възможностите на продукта.",
  },
  {
    title: "Подарък с характер",
    text: "Подбираме форма, детайл и завършек така, че подаръкът да носи истинска емоция.",
  },
];

export function HomeBenefits() {
  return (
    <section className="border-b border-boutique-line bg-boutique-sage-deep text-boutique-on-sage">
      <PageContainer className="grid gap-px py-12 md:grid-cols-3 md:py-14">
        {benefits.map((benefit, index) => (
          <article
            key={benefit.title}
            className={`px-2 py-5 md:px-8 md:py-2 ${
              index > 0 ? "border-t border-white/10 md:border-l md:border-t-0" : ""
            }`}
          >
            <p className="font-heading text-2xl text-boutique-paper">{benefit.title}</p>
            <p className="mt-3 text-sm leading-relaxed text-boutique-on-sage/75">
              {benefit.text}
            </p>
          </article>
        ))}
      </PageContainer>
    </section>
  );
}

export function HomeProcess() {
  const steps = [
    ["Изберете продукт", "Разгледайте каталога и отворете продукта, който харесвате."],
    ["Добавете детайли", "Попълнете текст, цветове или други налични опции за персонализация."],
    ["Потвърдете поръчката", "Прегледайте количката и изпратете данните за доставка."],
  ];

  return (
    <section className="border-y border-boutique-line bg-boutique-paper py-16 md:py-20">
      <PageContainer>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
            Как работи
          </p>
          <h2 className="mt-4 font-heading text-3xl text-boutique-ink sm:text-4xl">
            От идеята до готовия подарък
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map(([title, text], index) => (
            <article
              key={title}
              className="rounded-2xl border border-boutique-line bg-boutique-bg p-6"
            >
              <p className="font-heading text-3xl text-boutique-accent">0{index + 1}</p>
              <h3 className="mt-6 font-heading text-2xl text-boutique-ink">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-boutique-muted">{text}</p>
            </article>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}

export function HomeAtelier() {
  return (
    <section className="py-16 md:py-24">
      <PageContainer className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-boutique-line shadow-boutique-sm">
          <MediaPlaceholder label="Снимка от ателието" />
        </div>
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
            VeMiDi crafts
          </p>
          <h2 className="mt-4 font-heading text-3xl leading-tight text-boutique-ink sm:text-4xl">
            Малко ателие за големи поводи
          </h2>
          <p className="mt-6 text-base leading-relaxed text-boutique-muted">
            Вярваме, че най-хубавите подаръци не просто се купуват. Те се избират с мисъл,
            персонализират се за конкретен човек и се изработват с грижа към малките детайли.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex rounded-full border border-boutique-line px-7 py-3 text-sm font-semibold text-boutique-ink transition hover:border-boutique-accent/50"
          >
            Виж продуктите
          </Link>
        </div>
      </PageContainer>
    </section>
  );
}
