"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";
import { PageContainer } from "@/components/layout/page-container";

export function CartPanel() {
  const { lines, subtotal, setQuantity, removeLine } = useCart();

  if (lines.length === 0) {
    return (
      <section className="pb-20 pt-4">
        <PageContainer>
          <div className="rounded-2xl border border-boutique-line bg-boutique-paper px-8 py-16 text-center shadow-boutique-sm">
            <p className="font-heading text-2xl text-boutique-ink">Your cart is resting</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-boutique-muted">
              Nothing here yet — explore the collection and add something beautiful.
            </p>
            <Link
              href="/products"
              className="mt-8 inline-flex rounded-full bg-boutique-ink px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-boutique-paper transition hover:bg-boutique-accent"
            >
              Browse products
            </Link>
          </div>
        </PageContainer>
      </section>
    );
  }

  return (
    <section className="pb-20 pt-4">
      <PageContainer>
        <ul className="divide-y divide-boutique-line/90 overflow-hidden rounded-2xl border border-boutique-line bg-boutique-paper shadow-boutique">
          {lines.map((line) => (
            <li
              key={line.slug}
              className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
            >
              <div>
                <p className="font-heading text-lg text-boutique-ink">{line.title}</p>
                <p className="mt-1 text-sm text-boutique-muted">
                  €{line.price.toFixed(2)} each · {line.quantity} in cart
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                  Qty
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => setQuantity(line.slug, Number(e.target.value))}
                    className="w-20 rounded-lg border border-boutique-line bg-boutique-bg px-3 py-2 text-sm text-boutique-ink outline-none transition focus:border-boutique-accent/50"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeLine(line.slug)}
                  className="text-xs font-semibold uppercase tracking-wider text-boutique-accent underline-offset-4 transition hover:text-boutique-ink hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-end gap-5 border-t border-boutique-line/80 pt-8">
          <p className="font-heading text-2xl text-boutique-ink">Subtotal · €{subtotal.toFixed(2)}</p>
          <Link
            href="/checkout"
            className="rounded-full bg-boutique-ink px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-boutique-paper transition hover:bg-boutique-accent"
          >
            Proceed to checkout
          </Link>
        </div>
      </PageContainer>
    </section>
  );
}
