import Link from "next/link";

import { login, signup } from "@/app/auth/actions";
import { PageContainer } from "@/components/layout/page-container";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getMessage(value: string | string[] | undefined) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] : value;
}

const inputClass =
  "mt-2 w-full rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 text-sm text-boutique-ink outline-none transition placeholder:text-boutique-muted/60 focus:border-boutique-accent/50 focus:ring-1 focus:ring-boutique-accent/20";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const message = getMessage(params.message);

  return (
    <section className="pb-24 pt-8 md:pt-12">
      <PageContainer>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
            Atelier access
          </p>
          <h1 className="font-heading mt-5 text-4xl tracking-tight text-boutique-ink sm:text-5xl">
            Welcome back
          </h1>
          <p className="mt-5 text-base leading-relaxed text-boutique-muted">
            Sign in to save your details and complete checkout with Supabase authentication.
          </p>
        </div>

        {message ? (
          <p className="mx-auto mt-10 max-w-2xl rounded-2xl border border-boutique-accent/25 bg-boutique-warm/80 px-5 py-4 text-center text-sm text-boutique-ink">
            {message}
          </p>
        ) : null}

        <div className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-2">
          <article className="rounded-2xl border border-boutique-line bg-boutique-paper p-8 shadow-boutique-sm">
            <h2 className="font-heading text-2xl text-boutique-ink">Sign in</h2>
            <p className="mt-2 text-sm leading-relaxed text-boutique-muted">
              Returning guests can pick up where they left off.
            </p>
            <form action={login} className="mt-8 space-y-5">
              <label className="block text-left text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                Email
                <input type="email" name="email" required className={inputClass} />
              </label>
              <label className="block text-left text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                Password
                <input type="password" name="password" required className={inputClass} />
              </label>
              <button
                type="submit"
                className="w-full rounded-full bg-boutique-ink py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-boutique-paper transition hover:bg-boutique-accent"
              >
                Sign in
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-boutique-line bg-boutique-paper p-8 shadow-boutique-sm">
            <h2 className="font-heading text-2xl text-boutique-ink">Create account</h2>
            <p className="mt-2 text-sm leading-relaxed text-boutique-muted">
              New collectors — save addresses for faster checkout.
            </p>
            <form action={signup} className="mt-8 space-y-5">
              <label className="block text-left text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                Email
                <input type="email" name="email" required className={inputClass} />
              </label>
              <label className="block text-left text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                Password
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-full border border-boutique-line py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-boutique-ink transition hover:border-boutique-accent/40 hover:text-boutique-accent"
              >
                Create account
              </button>
            </form>
          </article>
        </div>

        <p className="mt-12 text-center text-sm text-boutique-muted">
          Continue as a guest on the{" "}
          <Link href="/products" className="font-medium text-boutique-accent underline-offset-4 hover:underline">
            products
          </Link>{" "}
          page.
        </p>
      </PageContainer>
    </section>
  );
}
