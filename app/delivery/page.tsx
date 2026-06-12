import type { Metadata } from "next";

import { InformationPage, InformationSection } from "@/components/legal/information-page";
import { splitLines, splitParagraphs } from "@/lib/content/format-content";
import { getSiteContent } from "@/lib/content/site-content";

export const metadata: Metadata = {
  title: "Доставка и плащане",
  description: "Куриери, срокове за изработка, доставка и плащане на поръчки от VeMiDi crafts.",
  alternates: { canonical: "/delivery" },
};

export default async function DeliveryPage() {
  const content = await getSiteContent();

  return (
    <InformationPage
      eyebrow={content["delivery.hero_eyebrow"]}
      title={content["delivery.hero_title"]}
      description={content["delivery.hero_description"]}
    >
      <p className="text-xs uppercase tracking-wider">{content["delivery.updated_at"]}</p>
      <InformationSection title={content["delivery.courier_title"]}>
        <p>{content["delivery.courier_intro"]}</p>
        <ul className="list-disc space-y-1 pl-5">
          {splitLines(content["delivery.courier_items"]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </InformationSection>
      <InformationSection title={content["delivery.timelines_title"]}>
        {splitParagraphs(content["delivery.timelines_text"]).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </InformationSection>
      <InformationSection title={content["delivery.price_title"]}>
        <p>{content["delivery.price_text"]}</p>
      </InformationSection>
      <InformationSection title={content["delivery.payment_title"]}>
        <p>{content["delivery.payment_text"]}</p>
      </InformationSection>
      <InformationSection title={content["delivery.address_title"]}>
        <p>{content["delivery.address_text"]}</p>
      </InformationSection>
    </InformationPage>
  );
}
