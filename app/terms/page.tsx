import type { Metadata } from "next";
import Link from "next/link";

import { InformationPage, InformationSection } from "@/components/legal/information-page";
import { siteConfig } from "@/config/site";
import { getSiteContent } from "@/lib/content/site-content";

export const metadata: Metadata = {
  title: "Общи условия",
  description: "Общи условия за поръчки от онлайн магазина VeMiDi crafts.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const content = await getSiteContent();
  const { business } = siteConfig;

  return (
    <InformationPage
      eyebrow={content["terms.hero_eyebrow"]}
      title={content["terms.hero_title"]}
      description={content["terms.hero_description"]}
    >
      <p className="text-xs uppercase tracking-wider">{content["terms.updated_at"]}</p>
      <InformationSection title={content["terms.merchant_title"]}>
        <p><strong>Търговец:</strong> {business.legalName}</p>
        <p><strong>ЕИК/Булстат:</strong> {business.registrationNumber}</p>
        <p><strong>Адрес:</strong> {content["business.address"]}</p>
        <p>
          <strong>Имейл:</strong>{" "}
          <a href={`mailto:${content["business.email"]}`}>{content["business.email"]}</a>
        </p>
        <p>
          <strong>Телефон:</strong>{" "}
          <a href={`tel:${content["business.phone_href"]}`}>
            {content["business.phone_display"]}
          </a>
        </p>
      </InformationSection>
      <InformationSection title={content["terms.order_title"]}>
        <p>{content["terms.order_text"]}</p>
      </InformationSection>
      <InformationSection title={content["terms.pricing_title"]}>
        <p>{content["terms.pricing_text"]}</p>
      </InformationSection>
      <InformationSection title={content["terms.personalized_title"]}>
        <p>{content["terms.personalized_text"]}</p>
      </InformationSection>
      <InformationSection title={content["terms.shipping_title"]}>
        <p>
          {content["terms.shipping_text"]}{" "}
          <Link className="font-semibold text-boutique-ink underline" href="/delivery">
            „Доставка и плащане“
          </Link>
          .
        </p>
      </InformationSection>
      <InformationSection title={content["terms.returns_title"]}>
        <p>
          {content["terms.returns_text"]}{" "}
          <Link className="font-semibold text-boutique-ink underline" href="/returns">
            „Връщане и рекламации“
          </Link>
          .
        </p>
      </InformationSection>
    </InformationPage>
  );
}
