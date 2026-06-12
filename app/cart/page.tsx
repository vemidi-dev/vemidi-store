import type { Metadata } from "next";

import { CartPanel } from "@/components/cart/cart-panel";
import { PageHero } from "@/components/ui/page-hero";
import { getSiteContent } from "@/lib/content/site-content";

export const metadata: Metadata = {
  title: "Количка",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const content = await getSiteContent();

  return (
    <div>
      <PageHero
        eyebrow={content["cart.hero_eyebrow"]}
        title={content["cart.hero_title"]}
        description={content["cart.hero_description"]}
        compact
      />
      <CartPanel
        content={{
          "cart.empty_title": content["cart.empty_title"],
          "cart.empty_text": content["cart.empty_text"],
          "cart.empty_button": content["cart.empty_button"],
          "cart.items_title": content["cart.items_title"],
          "cart.continue_shopping": content["cart.continue_shopping"],
          "cart.summary_title": content["cart.summary_title"],
          "cart.shipping_note": content["cart.shipping_note"],
          "cart.checkout_button": content["cart.checkout_button"],
          "cart.payment_note": content["cart.payment_note"],
        }}
      />
    </div>
  );
}
