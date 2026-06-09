import type { Metadata } from "next";

import { CartPanel } from "@/components/cart/cart-panel";
import { PageHero } from "@/components/ui/page-hero";

export const metadata: Metadata = {
  title: "Количка",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div>
      <PageHero
        eyebrow="Количка"
        title="Твоята количка"
        description="Прегледай избраните продукти, количествата и персонализацията преди да продължиш към поръчка."
      />
      <CartPanel />
    </div>
  );
}
