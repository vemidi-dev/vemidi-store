import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { siteConfig } from "@/config/site";

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M13.5 22v-8.2h2.8l.4-3.3h-3.2V8.5c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7v3.3h2.9V22h3.6z" />
    </svg>
  );
}

function IconPinterest({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
    </svg>
  );
}

const iconClass = "h-4 w-4 shrink-0 opacity-90 transition-opacity duration-200 group-hover:opacity-100";

export function TopBar() {
  const { topBar } = siteConfig;
  const pin = topBar.social.pinterest?.trim();

  return (
    <div className="border-b border-white/10 bg-boutique-sage text-boutique-on-sage">
      <PageContainer>
        <div className="flex flex-col gap-2 py-2 text-[0.7rem] font-medium tracking-wide sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2.5 sm:text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:gap-x-6">
            <Link
              href={topBar.email.href}
              className="underline-offset-2 transition hover:text-white hover:underline"
            >
              {topBar.email.label}
            </Link>
            <span className="hidden text-boutique-on-sage/40 sm:inline" aria-hidden>
              |
            </span>
            <Link
              href={topBar.phone.href}
              className="underline-offset-2 transition hover:text-white hover:underline"
            >
              {topBar.phone.label}
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:justify-end">
            <span className="mr-1 hidden text-boutique-on-sage/70 sm:inline">Последвайте ни</span>
            <div className="flex items-center gap-0.5">
              {topBar.social.instagram ? (
                <Link
                  href={topBar.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group grid h-8 w-8 place-items-center rounded-full text-boutique-on-sage transition hover:bg-white/10 hover:text-white"
                  aria-label="Instagram"
                >
                  <IconInstagram className={iconClass} />
                </Link>
              ) : null}
              {topBar.social.facebook ? (
                <Link
                  href={topBar.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group grid h-8 w-8 place-items-center rounded-full text-boutique-on-sage transition hover:bg-white/10 hover:text-white"
                  aria-label="Facebook"
                >
                  <IconFacebook className={iconClass} />
                </Link>
              ) : null}
              {pin ? (
                <Link
                  href={pin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group grid h-8 w-8 place-items-center rounded-full text-boutique-on-sage transition hover:bg-white/10 hover:text-white"
                  aria-label="Pinterest"
                >
                  <IconPinterest className={iconClass} />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
