import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { NavCartLink } from "@/components/layout/nav-cart-link";
import { PageContainer } from "@/components/layout/page-container";
import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

const navLinkClass =
  "relative text-[0.9375rem] font-medium text-boutique-muted transition-colors duration-200 after:pointer-events-none after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-boutique-accent after:transition-transform after:duration-300 hover:text-boutique-ink hover:after:scale-x-100";

export async function Header() {
  let user = null;
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }
  } catch {
    // Avoid 500 on cookie / network / Supabase edge cases during dev refresh.
    user = null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-boutique-line/70 bg-[#F7F3EF]/95 shadow-[0_1px_0_rgb(44_40_37_/0.04)] backdrop-blur-sm">
      <PageContainer>
        <div className="flex items-center justify-between gap-6 py-4 md:py-5">
          <Link
            href="/"
            className="font-heading shrink-0 text-lg tracking-tight text-boutique-ink transition-colors duration-200 hover:text-boutique-accent sm:text-xl md:text-2xl"
          >
            {siteConfig.name}
          </Link>

          <nav aria-label="Основна навигация" className="hidden flex-1 justify-center md:flex">
            <ul className="flex items-center gap-10 lg:gap-12">
              <li>
                <Link href="/" className={navLinkClass}>
                  Начало
                </Link>
              </li>
              <li>
                <Link href="/products" className={navLinkClass}>
                  Магазин
                </Link>
              </li>
              <li>
                <Link href="/categories" className={navLinkClass}>
                  Категории
                </Link>
              </li>
              <li>
                <NavCartLink />
              </li>
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <Link
                  href="/account"
                  className="hidden rounded-full border border-boutique-line/90 bg-[#F7F3EF] px-4 py-2 text-xs font-medium text-boutique-ink transition-colors duration-200 hover:border-boutique-accent/35 hover:text-boutique-accent sm:inline-flex"
                >
                  Акаунт
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-full border border-boutique-ink/15 bg-boutique-ink px-4 py-2 text-xs font-medium text-[#F7F3EF] transition-colors duration-200 hover:bg-boutique-accent"
                  >
                    Изход
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-boutique-ink/15 bg-boutique-ink px-4 py-2 text-xs font-medium text-[#F7F3EF] transition-colors duration-200 hover:bg-boutique-accent"
              >
                Вход
              </Link>
            )}
          </div>
        </div>
      </PageContainer>

      <nav
        aria-label="Мобилна навигация"
        className="border-t border-boutique-line/50 bg-[#F7F3EF] px-5 py-3.5 md:hidden"
      >
        <ul className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-8 gap-y-3">
          <li>
            <Link href="/" className={navLinkClass}>
              Начало
            </Link>
          </li>
          <li>
            <Link href="/products" className={navLinkClass}>
              Магазин
            </Link>
          </li>
          <li>
            <Link href="/categories" className={navLinkClass}>
              Категории
            </Link>
          </li>
          <li>
            <NavCartLink />
          </li>
        </ul>
      </nav>
    </header>
  );
}
