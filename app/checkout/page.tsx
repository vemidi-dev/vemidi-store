import type { Metadata } from "next";

import { CheckoutPanel } from "@/components/checkout/checkout-panel";
import { PageHero } from "@/components/ui/page-hero";
import { getSiteContent } from "@/lib/content/site-content";

export const metadata: Metadata = {
  title: "Завършване на поръчката",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const content = await getSiteContent();

  return (
    <div>
      <PageHero
        eyebrow={content["checkout.hero_eyebrow"]}
        title={content["checkout.hero_title"]}
        description={content["checkout.hero_description"]}
      />
      <CheckoutPanel
        content={{
          "checkout.empty_title": content["checkout.empty_title"],
          "checkout.empty_text": content["checkout.empty_text"],
          "checkout.empty_button": content["checkout.empty_button"],
          "checkout.contact_eyebrow": content["checkout.contact_eyebrow"],
          "checkout.contact_title": content["checkout.contact_title"],
          "checkout.delivery_eyebrow": content["checkout.delivery_eyebrow"],
          "checkout.delivery_title": content["checkout.delivery_title"],
          "checkout.payment_eyebrow": content["checkout.payment_eyebrow"],
          "checkout.payment_title": content["checkout.payment_title"],
          "checkout.payment_text": content["checkout.payment_text"],
          "checkout.privacy_consent": content["checkout.privacy_consent"],
          "checkout.summary_eyebrow": content["checkout.summary_eyebrow"],
          "checkout.summary_title": content["checkout.summary_title"],
          "checkout.delivery_price_note": content["checkout.delivery_price_note"],
          "checkout.submit_button": content["checkout.submit_button"],
          "checkout.back_to_cart": content["checkout.back_to_cart"],
        }}
      />
    </div>
  );
}
