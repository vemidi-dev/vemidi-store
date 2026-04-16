import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";
import { createClient } from "@/lib/supabase/server";

const panelClass =
  "rounded-2xl border border-boutique-line bg-boutique-paper p-8 shadow-boutique-sm md:p-10";

export default async function CheckoutPage() {
  const supabase = await createClient();

  if (!supabase) {
    return (
      <div>
        <PageHero
          eyebrow="Checkout"
          title="Supabase is not configured."
          description="Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to a .env.local file (see .env.example), restart the dev server, then sign in for full checkout."
        />
        <section className="pb-24 pt-4">
          <PageContainer>
            <div className={`${panelClass} border-boutique-accent/20 bg-boutique-warm/60`}>
              <p className="text-sm font-medium text-boutique-ink">
                Without these variables, auth and session refresh cannot run.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-boutique-muted">
                You can still browse products and use the cart (stored in this browser via
                localStorage).
              </p>
            </div>
          </PageContainer>
        </section>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div>
        <PageHero
          eyebrow="Checkout"
          title="Sign in to continue"
          description="Authenticate with Supabase to continue with shipping, payment, and confirmation."
        />
        <section className="pb-24 pt-4">
          <PageContainer>
            <div className={panelClass}>
              <h2 className="font-heading text-2xl text-boutique-ink">Your cart is waiting</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-boutique-muted">
                Signing in lets us associate checkout with your account and order history.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="rounded-full bg-boutique-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
                >
                  Sign in or create account
                </Link>
                <Link
                  href="/cart"
                  className="rounded-full border border-boutique-line px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
                >
                  Return to cart
                </Link>
              </div>
            </div>
          </PageContainer>
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        eyebrow="Checkout"
        title="Almost there"
        description="Authenticated checkout is ready for addresses, delivery, and payment — connect your order flow when you are ready."
      />
      <section className="pb-24 pt-4">
        <PageContainer>
          <div className={panelClass}>
            <p className="text-sm font-medium text-boutique-muted">
              Signed in as <span className="text-boutique-ink">{user.email}</span>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-boutique-muted">
              Next: map cart line items, collect shipping and personalization, then persist orders
              in Supabase before payment confirmation.
            </p>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
