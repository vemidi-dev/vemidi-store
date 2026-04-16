import { CartPanel } from "@/components/cart/cart-panel";
import { PageHero } from "@/components/ui/page-hero";

export default function CartPage() {
  return (
    <div>
      <PageHero
        eyebrow="Cart"
        title="Your cart"
        description="Items are stored in this browser (localStorage) until you connect checkout to Supabase orders."
      />
      <CartPanel />
    </div>
  );
}
