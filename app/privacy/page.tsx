import type { Metadata } from "next";

import { InformationPage, InformationSection } from "@/components/legal/information-page";
import { siteConfig } from "@/config/site";
import { splitLines } from "@/lib/content/format-content";
import { getSiteContent } from "@/lib/content/site-content";

export const metadata: Metadata = {
  title: "Политика за поверителност",
  description: "Как VeMiDi crafts събира, използва и съхранява лични данни.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const content = await getSiteContent();
  const { business } = siteConfig;

  return (
    <InformationPage
      eyebrow={content["privacy.hero_eyebrow"]}
      title={content["privacy.hero_title"]}
      description={content["privacy.hero_description"]}
    >
      <p className="text-xs uppercase tracking-wider">{content["privacy.updated_at"]}</p>
      <InformationSection title={content["privacy.controller_title"]}>
        <p>
          <strong>{business.legalName}</strong>, {content["business.address"]}
        </p>
        <p>
          Контакт:{" "}
          <a href={`mailto:${content["business.email"]}`}>{content["business.email"]}</a>,{" "}
          <a href={`tel:${content["business.phone_href"]}`}>
            {content["business.phone_display"]}
          </a>
        </p>
      </InformationSection>
      <InformationSection title={content["privacy.data_title"]}>
        <ul className="list-disc space-y-1 pl-5">
          {splitLines(content["privacy.data_items"]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </InformationSection>
      <InformationSection title={content["privacy.usage_title"]}>
        <p>{content["privacy.usage_text"]}</p>
      </InformationSection>
      <InformationSection title={content["privacy.storage_title"]}>
        <p>{content["privacy.storage_text"]}</p>
      </InformationSection>
      <InformationSection title={content["privacy.retention_title"]}>
        <p>{content["privacy.retention_text"]}</p>
      </InformationSection>
      <InformationSection title={content["privacy.rights_title"]}>
        <p>{content["privacy.rights_text"]}</p>
        <p>
          Изпратете искането си на{" "}
          <a href={`mailto:${content["business.email"]}`}>{content["business.email"]}</a>.
        </p>
      </InformationSection>
    </InformationPage>
  );
}
