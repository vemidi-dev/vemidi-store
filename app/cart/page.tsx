import { CartPanel } from "@/components/cart/cart-panel";
import { PageHero } from "@/components/ui/page-hero";

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
