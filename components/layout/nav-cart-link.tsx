"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";

const baseClass =
  "relative text-[0.9375rem] font-medium text-boutique-muted transition-colors duration-200 after:pointer-events-none after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-boutique-accent after:transition-transform after:duration-300 hover:text-boutique-ink hover:after:scale-x-100";

export function NavCartLink() {
  const { itemCount } = useCart();

  return (
    <Link href="/cart" className={baseClass}>
      Количка
      {itemCount > 0 ? (
        <span className="ml-1.5 text-xs font-normal tabular-nums text-boutique-accent">({itemCount})</span>
      ) : null}
    </Link>
  );
}
