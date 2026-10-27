import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SocialLinks } from "@/components/layout/social-links";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import ctaStyles from "@/components/layout/contact-order-cta.module.css";
import { siteConfig } from "@/config/site";
import { getSiteContent } from "@/lib/content/site-content";
import { getSiteMediaMap, resolveSiteMediaFromMap } from "@/lib/content/site-media";
import {
  buildInfoPageMetadataWithHomeHero,
  KONTAKTI_PAGE_METADATA,
} from "@/lib/seo/info-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildInfoPageMetadataWithHomeHero(KONTAKTI_PAGE_METADATA);
}

function ContactIcon({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-boutique-warm text-lg text-boutique-sage-deep">
      {children}
    </span>
  );
}

function ContactMethod({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <ContactIcon>{icon}</ContactIcon>
      <span className="min-w-0">
        <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-boutique-muted">
          {label}
        </span>
        <span className="mt-1 block break-words font-semibold text-boutique-ink">
          {value}
        </span>
      </span>
    </>
  );

  return href ? (
    <a
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-boutique-line bg-white p-4 shadow-boutique-sm transition hover:-translate-y-0.5 hover:border-boutique-sage/45"
    >
      {content}
    </a>
  ) : (
    <div className="flex items-center gap-4 rounded-2xl border border-boutique-line bg-white p-4 shadow-boutique-sm">
      {content}
    </div>
  );
}

export default async function ContactPage() {
  const [content, media] = await Promise.all([getSiteContent(), getSiteMediaMap()]);
  const atelierImage = resolveSiteMediaFromMap(media, "home.atelier");
  const email = content["business.email"];
  const phoneDisplay = content["business.phone_display"];
  const phoneHref = content["business.phone_href"];
  const address = content["business.address"];

  return (
    <div className="bg-boutique-bg">
      <VisualPageHero
        eyebrow={content["contact.eyebrow"]}
        title={content["contact.hero_title"]}
        description={content["contact.hero_description"]}
        imageSrc={atelierImage.src}
        imageAlt={atelierImage.alt}
      />

      <section className="py-10 md:py-16">
        <PageContainer className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-8">
          <article className="rounded-3xl border border-boutique-line bg-boutique-paper p-6 shadow-boutique-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
              Бърза връзка
            </p>
            <h2 className="mt-3 font-heading text-3xl text-boutique-ink">
              {content["contact.social_title"]}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-boutique-muted">
              {content["contact.social_description"]}
            </p>
            <div className="mt-7 flex justify-start">
              <SocialLinks variant="contact" />
            </div>
            <p className="mt-6 border-t border-boutique-line pt-5 text-sm font-medium text-boutique-sage-deep">
              {content["contact.response_note"]}
            </p>
          </article>

          <div className="grid gap-3">
            <ContactMethod
              icon={<span aria-hidden>✉</span>}
              label="Имейл"
              value={email}
              href={`mailto:${email}`}
            />
            <ContactMethod
              icon={<span aria-hidden>☎</span>}
              label="Телефон"
              value={phoneDisplay}
              href={`tel:${phoneHref}`}
            />
            {address ? (
              <ContactMethod
                icon={<span aria-hidden>⌂</span>}
                label="Ателие"
                value={address}
              />
            ) : null}
          </div>
        </PageContainer>
      </section>

      <section className="border-y border-boutique-line bg-white py-10 md:py-14">
        <PageContainer>
          <div className="grid gap-6 rounded-3xl bg-boutique-sage-deep px-6 py-8 text-boutique-on-sage shadow-boutique md:grid-cols-[1fr_auto] md:items-center md:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-on-sage/70">
                Идея по поръчка
              </p>
              <h2 className="mt-3 font-heading text-3xl">
                {content["contact.custom_order_title"]}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-boutique-on-sage/80">
                {content["contact.custom_order_text"]}
              </p>
            </div>
            <a
              href={`mailto:${email}?subject=${encodeURIComponent("Запитване за персонална поръчка")}`}
              className={`${ctaStyles.link} inline-flex w-fit rounded-lg px-6 py-3 text-sm font-semibold transition-colors`}
            >
              Изпратете запитване
            </a>
          </div>
        </PageContainer>
      </section>

      <section className="py-8">
        <PageContainer className="text-center">
          <p className="text-xs leading-relaxed text-boutique-muted">
            {siteConfig.business.legalName}
            <span aria-hidden className="mx-2">·</span>
            ЕИК {siteConfig.business.registrationNumber}
          </p>
        </PageContainer>
      </section>
    </div>
  );
}
