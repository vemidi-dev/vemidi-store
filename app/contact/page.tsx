import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Контакти",
  description: "Контакти, социални профили и данни за търговеца VeMiDi crafts.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const { business, topBar } = siteConfig;
  const socialLinks = [
    ["Facebook", topBar.social.facebook],
    ["Instagram", topBar.social.instagram],
    ["TikTok", topBar.social.tiktok],
  ];

  return (
    <div>
      <PageHero eyebrow="Свържете се с нас" title="Контакти" description="За персонална поръчка, събитие или въпрос относно продукт." />
      <section className="pb-24 pt-10">
        <PageContainer>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <article className="rounded-2xl border border-boutique-line bg-boutique-paper p-8 shadow-boutique-sm">
              <h2 className="font-heading text-2xl text-boutique-ink">Имейл и телефон</h2>
              <div className="mt-5 space-y-3 text-boutique-muted">
                <p><span className="font-semibold text-boutique-ink">Имейл:</span> <a className="hover:text-boutique-accent" href={`mailto:${business.email}`}>{business.email}</a></p>
                <p><span className="font-semibold text-boutique-ink">Телефон:</span> <a className="hover:text-boutique-accent" href={`tel:${business.phoneHref}`}>{business.phoneDisplay}</a></p>
              </div>
              <h2 className="mt-8 font-heading text-2xl text-boutique-ink">Социални мрежи</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {socialLinks.map(([label, href]) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-boutique-line px-4 py-2 text-sm font-semibold text-boutique-ink hover:border-boutique-accent">
                    {label}
                  </a>
                ))}
              </div>
            </article>
            <article className="rounded-2xl border border-boutique-line bg-boutique-paper p-8 shadow-boutique-sm">
              <h2 className="font-heading text-2xl text-boutique-ink">Данни за търговеца</h2>
              <dl className="mt-5 space-y-4 text-boutique-muted">
                <div><dt className="text-xs font-semibold uppercase tracking-wider">Търговец</dt><dd className="mt-1 text-boutique-ink">{business.legalName}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wider">ЕИК/Булстат</dt><dd className="mt-1 text-boutique-ink">{business.registrationNumber}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wider">Адрес</dt><dd className="mt-1 text-boutique-ink">{business.address}</dd></div>
              </dl>
            </article>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
