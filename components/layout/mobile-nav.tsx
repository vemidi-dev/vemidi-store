"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { NavCartLink } from "@/components/layout/nav-cart-link";
import { siteConfig } from "@/config/site";

const mobileNavLinkClass =
  "block rounded-lg px-3 py-3 text-base font-medium text-boutique-ink transition-colors duration-200 hover:bg-boutique-paper hover:text-boutique-rose-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boutique-rose-deep";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="grid h-10 w-10 place-items-center rounded-lg border border-boutique-line/80 bg-white text-boutique-ink transition-colors duration-200 hover:border-boutique-rose-deep/35 hover:bg-boutique-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boutique-rose-deep"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Затвори менюто" : "Отвори менюто"}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="sr-only">{open ? "Затвори менюто" : "Отвори менюто"}</span>
        {open ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-boutique-ink/35 backdrop-blur-[1px]"
            aria-label="Затвори менюто"
            onClick={closeMenu}
          />

          <nav
            id={panelId}
            aria-label="Мобилна навигация"
            className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-boutique-line bg-white shadow-boutique"
          >
            <div className="flex items-center justify-between border-b border-boutique-line/70 px-5 py-4">
              <p className="font-heading text-lg text-boutique-ink">Меню</p>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-lg text-boutique-muted transition-colors duration-200 hover:bg-boutique-paper hover:text-boutique-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boutique-rose-deep"
                aria-label="Затвори менюто"
                onClick={closeMenu}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto px-3 py-4">
              {siteConfig.navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={mobileNavLinkClass} onClick={closeMenu}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="mt-1 border-t border-boutique-line/70 pt-1">
                <NavCartLink
                  className={mobileNavLinkClass}
                  onNavigate={closeMenu}
                />
              </li>
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
