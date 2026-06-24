import type { Metadata } from "next";
import Link from "next/link";

import { InformationPage, InformationSection } from "@/components/legal/information-page";
import { splitLines } from "@/lib/content/format-content";
import { getSiteContent } from "@/lib/content/site-content";
import {
  buildInfoPageMetadataWithHomeHero,
  RETURNS_PAGE_METADATA,
} from "@/lib/seo/info-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildInfoPageMetadataWithHomeHero(RETURNS_PAGE_METADATA);
}

export default async function ReturnsPage() {
  const content = await getSiteContent();

  return (
    <InformationPage
      eyebrow={content["returns.hero_eyebrow"]}
      title={content["returns.hero_title"]}
      description={content["returns.hero_description"]}
    >
      <p className="text-xs uppercase tracking-wider">{content["returns.updated_at"]}</p>
      <InformationSection title={content["returns.withdrawal_title"]}>
        <p>{content["returns.withdrawal_text"]}</p>
        <p>
          За подаване на заявление за отказ от договор използвайте{" "}
          <Link className="font-semibold text-boutique-ink underline" href="/withdrawal">
            формата за отказ от договор
          </Link>
          .
        </p>
      </InformationSection>
      <InformationSection title={content["returns.personalized_title"]}>
        <p>{content["returns.personalized_text"]}</p>
      </InformationSection>
      <InformationSection title={content["returns.claim_title"]}>
        <ul className="list-disc space-y-1 pl-5">
          {splitLines(content["returns.claim_items"]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </InformationSection>
      <InformationSection title={content["returns.costs_title"]}>
        <p>{content["returns.costs_text"]}</p>
      </InformationSection>
      <InformationSection title={content["returns.contact_title"]}>
        <p>
          Имейл:{" "}
          <a href={`mailto:${content["business.email"]}`}>{content["business.email"]}</a>
        </p>
        <p>
          Телефон:{" "}
          <a href={`tel:${content["business.phone_href"]}`}>
            {content["business.phone_display"]}
          </a>
        </p>
        <p>Адрес: {content["business.address"]}</p>
      </InformationSection>
    </InformationPage>
  );
}
