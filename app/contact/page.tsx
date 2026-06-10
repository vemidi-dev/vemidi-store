import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SocialLinks } from "@/components/layout/social-links";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Контакти",
  description: "Контакти, социални профили и данни за търговеца VeMiDi crafts.",
  alternates: { canonical: "/contact" },
};

type ContactCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

function ContactCard({ title, children, className = "" }: ContactCardProps) {
  return (
    <article
      className={`rounded-2xl border border-boutique-line/80 bg-boutique-paper p-5 shadow-boutique-sm sm:p-6 ${className}`}
    >
      <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-boutique-rose-deep">
        {title}
      </h2>
      <div className="mt-3 text-sm leading-relaxed text-boutique-ink">{children}</div>
    </article>
  );
}

export default function ContactPage() {
  const { business } = siteConfig;
  const hasAddress = Boolean(business.address?.trim());

  return (
    <div>
      <section className="border-b border-boutique-line bg-boutique-paper">
        <PageContainer className="py-10 text-center md:py-12">
          <h1 className="font-heading text-3xl leading-tight tracking-tight text-boutique-ink sm:text-4xl">
            Свържете се с нас
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-boutique-muted sm:text-base">
            Пишете ни за въпроси, персонализирани поръчки или идеи за специален подарък.
          </p>
        </PageContainer>
      </section>

      <section className="pb-20 pt-10 md:pb-24">
        <PageContainer className="mx-auto max-w-3xl space-y-8">
          <article className="rounded-2xl border border-boutique-line bg-boutique-bg/60 px-5 py-7 text-center sm:px-8 sm:py-8">
            <h2 className="font-heading text-xl text-boutique-ink sm:text-2xl">
              Най-бърз начин за връзка
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-boutique-muted">
              Най-бързо ще получите отговор през социалните ни мрежи.
            </p>
            <div className="mt-6">
              <SocialLinks variant="contact" />
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2">
            <ContactCard title="Телефон">
              <a
                href={`tel:${business.phoneHref}`}
                className="font-medium text-boutique-sage-deep transition hover:text-boutique-accent"
              >
                {business.phoneDisplay}
              </a>
            </ContactCard>

            <ContactCard title="Имейл">
              <a
                href={`mailto:${business.email}`}
                className="break-all font-medium text-boutique-sage-deep transition hover:text-boutique-accent"
              >
                {business.email}
              </a>
            </ContactCard>

            {hasAddress ? (
              <ContactCard title="Ателие" className="sm:col-span-2">
                <p>{business.address}</p>
              </ContactCard>
            ) : null}
          </div>

          <div className="rounded-xl border border-boutique-line/60 bg-boutique-bg/40 px-5 py-4 text-center">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-boutique-muted">
              Данни за търговеца
            </p>
            <p className="mt-2 text-xs leading-relaxed text-boutique-muted">
              {business.legalName}
              <span aria-hidden className="mx-2 text-boutique-line">
                ·
              </span>
              ЕИК {business.registrationNumber}
            </p>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
