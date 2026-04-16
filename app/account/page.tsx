import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { PageContainer } from "@/components/layout/page-container";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login?message=Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please sign in to access your account.");
  }

  return (
    <section className="pb-24 pt-8 md:pt-12">
      <PageContainer>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
          Account
        </p>
        <h1 className="font-heading mt-4 text-4xl tracking-tight text-boutique-ink sm:text-5xl">
          Welcome back
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-boutique-muted">
          Signed in as <span className="font-medium text-boutique-ink">{user.email}</span>.
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <article className="rounded-2xl border border-boutique-line bg-boutique-paper p-8 shadow-boutique-sm">
            <h2 className="font-heading text-xl text-boutique-ink">Orders & checkout</h2>
            <p className="mt-3 text-sm leading-relaxed text-boutique-muted">
              Your studio account is ready for saved addresses, order history, and a smoother
              repeat experience.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/checkout"
                className="rounded-full bg-boutique-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
              >
                Checkout
              </Link>
              <Link
                href="/products"
                className="rounded-full border border-boutique-line px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
              >
                Shop
              </Link>
            </div>
          </article>

          <article className="rounded-2xl border border-boutique-line bg-boutique-paper p-8 shadow-boutique-sm">
            <h2 className="font-heading text-xl text-boutique-ink">Session</h2>
            <p className="mt-3 text-sm leading-relaxed text-boutique-muted">
              Sign out when you are finished browsing our atelier.
            </p>
            <form action={signOut} className="mt-8">
              <button
                type="submit"
                className="rounded-full border border-boutique-line px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
              >
                Sign out
              </button>
            </form>
          </article>
        </div>
      </PageContainer>
    </section>
  );
}
