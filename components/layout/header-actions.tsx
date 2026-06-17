"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";

function SearchIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M5 8h14l-1 12H6L5 8Z" strokeLinejoin="round" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" strokeLinecap="round" />
    </svg>
  );
}

const iconButtonClass =
  "relative grid h-11 w-11 place-items-center rounded-lg border border-boutique-line/80 bg-white text-boutique-ink transition hover:border-boutique-sage/45 hover:bg-boutique-paper";

export function HeaderActions() {
  const { itemCount } = useCart();

  return (
    <div className="flex items-center gap-2">
      <form action="/producti" className="hidden items-center lg:flex">
        <label className="relative">
          <span className="sr-only">Търсене на продукт</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-boutique-muted">
            <SearchIcon />
          </span>
          <input
            name="q"
            type="search"
            placeholder="Търси..."
            className="h-10 w-32 rounded-lg border border-boutique-line bg-boutique-paper pl-10 pr-3 text-sm text-boutique-ink outline-none transition focus:w-44 focus:border-boutique-sage xl:w-36"
          />
        </label>
      </form>

      <Link
        href="/producti#product-grid"
        aria-label="Търсене на продукт"
        title="Търсене"
        className={`${iconButtonClass} hidden min-[360px]:grid lg:hidden`}
      >
        <SearchIcon />
      </Link>

      <Link
        href="/cart"
        aria-label={`Количка${itemCount ? `, ${itemCount} продукта` : ""}`}
        title="Количка"
        className={iconButtonClass}
      >
        <CartIcon />
        {itemCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-boutique-sage-deep px-1 text-[10px] font-bold leading-none text-boutique-on-sage">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        ) : null}
      </Link>
    </div>
  );
}
