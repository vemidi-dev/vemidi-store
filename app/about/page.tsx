import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";
import { splitParagraphs } from "@/lib/content/format-content";
import { getSiteContent } from "@/lib/content/site-content";
import {
  getSiteMediaMap,
  resolveSiteMediaFromMap,
} from "@/lib/content/site-media";

export const metadata: Metadata = {
  title: "За нас",
  description:
    "VeMiDi Crafts създава персонализирани подаръци и декорации от дърво с лазерно изрязване, гравиране и ръчна довършителна работа.",
  alternates: { canonical: "/za-nas" },
};

export default async function AboutPage() {
  const [content, siteMediaMap] = await Promise.all([
    getSiteContent(),
    getSiteMediaMap(),
  ]);
  const heroImage = resolveSiteMediaFromMap(siteMediaMap, "about.hero");
  const sections = [
    {
      title: content["about.section_1_title"],
      paragraphs: splitParagraphs(content["about.section_1_text"]),
    },
    {
      title: content["about.section_2_title"],
      paragraphs: splitParagraphs(content["about.section_2_text"]),
    },
    {
      title: content["about.section_3_title"],
      paragraphs: splitParagraphs(content["about.section_3_text"]),
    },
  ];

  return (
    <div>
      <PageHero
        eyebrow={content["about.hero_eyebrow"]}
        title={content["about.hero_title"]}
        description={content["about.hero_description"]}
      />

      <section className="py-14 md:py-20">
        <PageContainer className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-boutique-line bg-boutique-paper shadow-boutique-sm">
            <Image
              src={heroImage.src}
              alt={heroImage.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          <div>
            <h2 className="font-heading text-3xl leading-tight text-boutique-ink sm:text-4xl">
              {content["about.intro_title"]}
            </h2>
            <p className="mt-5 text-base leading-8 text-boutique-muted">
              {content["about.intro_text"]}
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
            {content["about.closing_text"]}
          </p>
          <p className="mt-4 font-heading text-2xl text-boutique-ink sm:text-3xl">
            {content["about.closing_tagline"]}
          </p>
          <Link
            href="/producti"
            className="mt-8 inline-flex rounded-full bg-boutique-ink px-8 py-3 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
          >
            {content["about.cta_button"]}
          </Link>
        </PageContainer>
      </section>
    </div>
  );
}
