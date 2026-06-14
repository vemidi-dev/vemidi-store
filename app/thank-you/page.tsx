import type { Metadata } from "next";

import { ThankYouContent } from "@/components/thank-you/thank-you-content";
import { PageContainer } from "@/components/layout/page-container";

export const metadata: Metadata = {
  title: "Благодарим за поръчката",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <main className="py-16 md:py-24">
      <PageContainer>
        <ThankYouContent />
      </PageContainer>
    </main>
  );
}
