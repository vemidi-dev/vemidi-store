import type { Metadata } from "next";

import { ThankYouContent } from "@/components/thank-you/thank-you-content";
import { PageContainer } from "@/components/layout/page-container";
import {
  getSiteMediaMap,
  resolveSiteMediaFromMap,
} from "@/lib/content/site-media";

export const metadata: Metadata = {
  title: "Благодарим за поръчката",
  robots: { index: false, follow: false },
};

export default async function ThankYouPage() {
  const siteMediaMap = await getSiteMediaMap();
  const heroImage = resolveSiteMediaFromMap(siteMediaMap, "checkout.thank_you");

  return (
    <main className="py-16 md:py-24">
      <PageContainer>
        <ThankYouContent heroImage={heroImage} />
      </PageContainer>
    </main>
  );
}
