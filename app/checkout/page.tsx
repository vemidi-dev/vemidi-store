import type { Metadata } from "next";

import { CheckoutPanel } from "@/components/checkout/checkout-panel";
import { PageHero } from "@/components/ui/page-hero";

export const metadata: Metadata = {
  title: "Завършване на поръчката",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div>
      <PageHero
        eyebrow="Поръчка"
        title="Данни за доставка"
        description="Прегледайте продуктите и попълнете информацията за доставка. Плащането е с наложен платеж при получаване."
      />
      <CheckoutPanel />
    </div>
  );
}
