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
    ["Изберете продукт", "Разгледайте каталога и отворете продукта, който харесвате."],
    ["Персонализирайте", "Добавете име, дата, послание или предпочитани цветове."],
    ["Ние изработваме", "С внимание към всеки детайл и любов към ръчната работа."],
    ["Получавате с усмивка", "Изпращаме готовия подарък с наложен платеж."],
  ];

  return (
    <section className="border-y border-boutique-line bg-white py-14 md:py-16">
      <PageContainer>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl text-boutique-ink">
            Как работи? <span className="text-boutique-rose-deep">♡</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-8 md:grid-cols-4">
          {steps.map(([title, text], index) => (
            <article
              key={title}
              className="relative text-center"
            >
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-boutique-rose/40 bg-boutique-blush font-heading text-2xl text-boutique-rose-deep">
                0{index + 1}
              </div>
              <h3 className="mt-5 font-heading text-xl text-boutique-ink">{title}</h3>
              <p className="mx-auto mt-2 max-w-[15rem] text-xs leading-5 text-boutique-muted">
                {text}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-boutique-rose-deep">
          ♡ Ако имате въпрос, винаги сме на разположение.
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
