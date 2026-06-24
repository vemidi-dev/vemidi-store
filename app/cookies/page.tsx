import type { Metadata } from "next";

import { InformationPage, InformationSection } from "@/components/legal/information-page";
import { getSiteContent } from "@/lib/content/site-content";
import {
  buildInfoPageMetadataWithHomeHero,
  COOKIES_PAGE_METADATA,
} from "@/lib/seo/info-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildInfoPageMetadataWithHomeHero(COOKIES_PAGE_METADATA);
}

export default async function CookiesPage() {
  const content = await getSiteContent();

  return (
    <InformationPage
      eyebrow={content["cookies.hero_eyebrow"]}
      title={content["cookies.hero_title"]}
      description={content["cookies.hero_description"]}
    >
      <p className="text-xs uppercase tracking-wider">{content["cookies.updated_at"]}</p>
      <InformationSection title={content["cookies.what_title"]}>
        <p>{content["cookies.what_text"]}</p>
      </InformationSection>
      <InformationSection title={content["cookies.usage_title"]}>
        <p>{content["cookies.usage_text"]}</p>
      </InformationSection>
      <InformationSection title={content["cookies.analytics_title"]}>
        <p>{content["cookies.analytics_text"]}</p>
      </InformationSection>
      <InformationSection title={content["cookies.contact_title"]}>
        <p>
          {content["cookies.contact_text"]}{" "}
          <a href={`mailto:${content["business.email"]}`}>{content["business.email"]}</a>.
        </p>
      </InformationSection>
    </InformationPage>
  );
}
