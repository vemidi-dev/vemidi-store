import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";

export const metadata: Metadata = {
  title: "За нас",
  description:
    "VeMiDi Crafts създава персонализирани подаръци и декорации от дърво с лазерно изрязване, гравиране и ръчна довършителна работа.",
  alternates: { canonical: "/about" },
};

const sections = [
  {
    title: "Подаръци за важните моменти",
    paragraphs: [
      "При нас ще откриете подаръци за сватба, кръщене, рожден ден, юбилей, учител, бебе, нов дом и още много специални поводи. Всеки продукт може да бъде персонализиран с име, дата, послание или детайл, който да го направи наистина уникален.",
      "Независимо дали търсите нежен плик за пари, кутия за спомени, рамка със скандинавски мъх, подарък за учител или творчески комплект за дете — нашата цел е подаръкът да бъде не просто красив, а запомнящ се.",
    ],
  },
  {
    title: "Ръчна изработка с отношение",
    paragraphs: [
      "Работим с естествени материали, най-често брезов шперплат, и комбинираме дърво, гравюра, цветове, панделки, мъх и други декоративни елементи. Обичаме изчистената визия, нежните цветове и малките детайли, които правят всеки продукт различен.",
      "За нас е важно подаръкът да изглежда красиво, но и да носи лично усещане — като нещо създадено специално за човека, който ще го получи.",
    ],
  },
  {
    title: "Как поръчвате",
    paragraphs: [
      "Избирате продукт, добавяте желаната персонализация, а след това се свързваме с вас за потвърждение на детайлите и срока за изработка. Така сме сигурни, че всичко ще бъде подготвено точно както го искате.",
    ],
  },
];

export default function AboutPage() {
  return (
    <div>
      <PageHero
        eyebrow="VeMiDi crafts"
        title="За нас"
        description="Вярваме, че най-хубавите подаръци не са просто предмети — те носят спомен, емоция и лично послание."
      />

      <section className="py-14 md:py-20">
        <PageContainer className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-boutique-line bg-boutique-paper shadow-boutique-sm">
            <Image
              src="/assets/about.png"
              alt="Ръчно изработени персонализирани подаръци в ателието VeMiDi Crafts"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>

          <div>
            <h2 className="font-heading text-3xl leading-tight text-boutique-ink sm:text-4xl">
              Персонализирани подаръци с душа
            </h2>
            <p className="mt-5 text-base leading-8 text-boutique-muted">
              Създаваме персонализирани подаръци и декорации от дърво, изработени с
              внимание към всеки детайл. Всеки продукт започва като идея, преминава през
              прецизно лазерно изрязване и гравиране, а след това се довършва ръчно, за
              да се превърне в нещо специално и лично.
            </p>
          </div>
        </PageContainer>
      </section>

      <section className="border-y border-boutique-line bg-boutique-paper py-14 md:py-20">
        <PageContainer className="mx-auto max-w-3xl space-y-12">
          {sections.map((section) => (
            <article key={section.title}>
              <h2 className="font-heading text-2xl text-boutique-ink sm:text-3xl">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-base leading-8 text-boutique-muted"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </PageContainer>
      </section>

      <section className="py-14 md:py-20">
        <PageContainer className="mx-auto max-w-3xl text-center">
          <p className="text-base leading-8 text-boutique-muted">
            Благодарим ви, че избирате ръчно изработени подаръци с душа.
          </p>
          <p className="mt-4 font-heading text-2xl text-boutique-ink sm:text-3xl">
            VeMiDi Crafts — Подари ми спомен
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex rounded-full bg-boutique-ink px-8 py-3 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
          >
            Разгледай продуктите
          </Link>
        </PageContainer>
      </section>
    </div>
  );
}
