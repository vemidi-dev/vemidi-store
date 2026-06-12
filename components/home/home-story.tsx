import Image from "next/image";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import type { SiteContent } from "@/lib/content/site-content";

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
      <PageContainer className="grid grid-cols-2 gap-x-5 gap-y-5 py-6 sm:py-8 md:max-w-7xl md:grid-cols-4 md:gap-0">
        {benefits.map((benefit, index) => (
          <article
            className={`flex items-start gap-3 px-0 sm:items-center sm:px-2 md:px-6 ${
              index > 0 ? "md:border-l md:border-boutique-line" : ""
            }`}
            key={benefit.title}
          >
            <span className="mt-0.5 text-xl text-boutique-rose-deep sm:mt-0 sm:text-2xl">
              {benefit.icon}
            </span>
            <div>
              <p className="text-sm font-semibold leading-snug text-boutique-ink">
                {benefit.title}
              </p>
              <p className="mt-1 text-xs leading-snug text-boutique-muted sm:leading-relaxed">
                {benefit.text}
              </p>
            </div>
          </article>
        ))}
      </PageContainer>
    </section>
  );
}

export function HomeProcess({ content }: { content: SiteContent }) {
  const steps = [
    {
      title: content["home.process_step_1_title"],
      text: content["home.process_step_1_text"],
      icon: "◇",
    },
    {
      title: content["home.process_step_2_title"],
      text: content["home.process_step_2_text"],
      icon: "✎",
    },
    {
      title: content["home.process_step_3_title"],
      text: content["home.process_step_3_text"],
      icon: "✓",
    },
  ];

  return (
    <section className="border-y border-boutique-line bg-boutique-paper py-12 md:py-20">
      <PageContainer className="md:max-w-7xl">
        <div className="text-center">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-boutique-sage-deep">
            {content["home.process_eyebrow"]}
          </p>
          <h2 className="mt-3 font-heading text-3xl tracking-tight text-boutique-ink md:text-4xl">
            {content["home.process_title"]}
          </h2>
        </div>

        <ol className="relative mx-auto mt-8 grid max-w-5xl gap-3 md:mt-10 md:grid-cols-3 md:gap-6">
          {steps.map((step, index) => (
            <li
              className="relative flex items-center gap-4 rounded-2xl border border-boutique-line/80 bg-white px-4 py-4 shadow-boutique-sm md:flex-col md:gap-4 md:px-7 md:py-8 md:text-center"
              key={step.title}
            >
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-boutique-sage-deep font-heading text-lg text-boutique-on-sage md:h-12 md:w-12"
              >
                {step.icon}
              </span>
              <div>
                <p className="text-sm font-semibold leading-snug text-boutique-ink md:text-base">
                  <span className="mr-1.5 text-xs text-boutique-accent">
                    {index + 1}.
                  </span>
                  {step.title}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-boutique-muted md:text-sm md:leading-6">
                  {step.text}
                </p>
              </div>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-lg text-boutique-accent md:block"
                >
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        <p className="mx-auto mt-7 max-w-2xl text-center text-sm leading-relaxed text-boutique-muted">
          {content["home.process_note"]}
        </p>
      </PageContainer>
    </section>
  );
}

export function HomeAtelier({ content }: { content: SiteContent }) {
  return (
    <section className="border-b border-boutique-line bg-boutique-blush/40">
      <div className="grid lg:grid-cols-2">
        <div className="relative min-h-[20rem] overflow-hidden sm:min-h-[26rem] lg:min-h-[34rem]">
          <Image
            alt="Опаковане на ръчно изработени подаръци в ателието на VeMiDi"
            className="object-cover"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            src="/assets/home-atelier.webp"
          />
        </div>
        <div className="flex items-center px-6 py-12 sm:px-12 sm:py-16 lg:px-20">
          <div className="max-w-xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-boutique-rose-deep">
              ♡ {content["home.atelier_eyebrow"]}
            </p>
            <h2 className="mt-4 font-heading text-3xl leading-tight tracking-tight text-boutique-ink sm:text-4xl lg:text-5xl">
              {content["home.atelier_title"]}
              <span className="block italic text-boutique-rose-deep">
                {content["home.atelier_title_accent"]}
              </span>
            </h2>
            <p className="mt-6 text-base leading-8 text-boutique-muted lg:text-lg">
              {content["home.atelier_text"]}
            </p>
            <Link
              className="mt-8 inline-flex rounded-lg bg-boutique-rose-deep px-6 py-3 text-sm font-semibold text-white transition hover:bg-boutique-ink"
              href="/about"
            >
              {content["home.atelier_button"]}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
