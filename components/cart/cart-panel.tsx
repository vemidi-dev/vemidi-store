"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";
import { PageContainer } from "@/components/layout/page-container";
import { formatEur } from "@/lib/format-eur";
import type { CartPageContent } from "@/lib/content/site-content";

export function CartPanel({ content }: { content: CartPageContent }) {
  const { lines, itemCount, subtotal, setQuantity, removeLine } = useCart();

  if (lines.length === 0) {
    return (
      <section className="pb-24 pt-8">
        <PageContainer>
          <div className="rounded-2xl border border-boutique-line bg-boutique-paper px-8 py-16 text-center shadow-boutique-sm">
            <p className="font-heading text-2xl text-boutique-ink">
              {content["cart.empty_title"]}
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm text-boutique-muted">
              {content["cart.empty_text"]}
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex rounded-full bg-boutique-ink px-8 py-3.5 text-sm font-semibold tracking-wide text-boutique-paper transition hover:bg-boutique-accent"
            >
              {content["cart.empty_button"]}
            </Link>
          </div>
        </PageContainer>
      </section>
    );
  }

  return (
    <section className="bg-white pb-24 pt-8 md:pt-10">
      <PageContainer>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8">
          <div>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-heading text-2xl text-boutique-ink">
                  {content["cart.items_title"]}
                </h2>
                <p className="mt-1 text-sm text-boutique-muted">
                  {itemCount} {itemCount === 1 ? "артикул" : "артикула"}
                </p>
              </div>
              <Link
                href="/shop"
                className="text-xs font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
              >
                {content["cart.continue_shopping"]}
              </Link>
            </div>

            <ul className="divide-y divide-boutique-line/90 overflow-hidden rounded-2xl border border-boutique-line bg-boutique-paper shadow-boutique-sm">
              {lines.map((line) => (
                <li key={line.lineId} className="p-4 sm:p-5">
                  <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[7rem_minmax(0,1fr)_auto]">
                    <Link
                      href={`/products/${line.slug}`}
                      className="relative aspect-square overflow-hidden rounded-xl border border-boutique-line bg-boutique-bg"
                    >
                      {line.imageSrc ? (
                        <Image
                          src={line.imageSrc}
                          alt={line.title}
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-2xl text-boutique-muted">
                          ◇
                        </span>
                      )}
                    </Link>

                    <div className="min-w-0">
                      <Link href={`/products/${line.slug}`}>
                        <h3 className="font-heading text-base leading-snug text-boutique-ink transition hover:text-boutique-sage-deep sm:text-lg">
                          {line.title}
                        </h3>
                      </Link>
                      <p className="mt-1 text-sm font-semibold text-boutique-sage-deep">
                        {formatEur(line.price)}
                      </p>

                      {line.personalization ? (
                        <details className="mt-3 text-xs text-boutique-muted">
                          <summary className="cursor-pointer font-semibold text-boutique-ink/80">
                            Персонализация
                          </summary>
                          <p className="mt-2 whitespace-pre-line leading-5">
                            {line.personalization}
                          </p>
                        </details>
                      ) : null}

                      {line.selectedColors?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {line.selectedColors.map((item) => (
                            <span
                              key={`${line.lineId}-${item.groupId}-${item.optionId}`}
                              className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[10px] text-boutique-muted"
                            >
                              {item.optionHex ? (
                                <span
                                  aria-hidden
                                  className="h-3 w-3 rounded-full border border-boutique-line"
                                  style={{ backgroundColor: item.optionHex }}
                                />
                              ) : null}
                              {item.optionName}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="col-span-2 flex items-center justify-between gap-3 border-t border-boutique-line/70 pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-between sm:border-0 sm:pt-0">
                      <div
                        className="inline-flex items-center rounded-lg border border-boutique-line bg-white"
                        aria-label={`Количество за ${line.title}`}
                      >
                        <button
                          type="button"
                          aria-label="Намали количеството"
                          onClick={() => setQuantity(line.lineId, line.quantity - 1)}
                          className="grid h-9 w-9 place-items-center text-lg text-boutique-muted transition hover:text-boutique-ink"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          aria-label={`Количество за ${line.title}`}
                          value={line.quantity}
                          onChange={(event) =>
                            setQuantity(line.lineId, Number(event.target.value))
                          }
                          className="h-9 w-10 border-x border-boutique-line bg-transparent text-center text-sm text-boutique-ink outline-none"
                        />
                        <button
                          type="button"
                          aria-label="Увеличи количеството"
                          onClick={() => setQuantity(line.lineId, line.quantity + 1)}
                          className="grid h-9 w-9 place-items-center text-lg text-boutique-muted transition hover:text-boutique-ink"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="font-heading text-lg text-boutique-ink">
                          {formatEur(line.price * line.quantity)}
                        </p>
                        <button
                          type="button"
                          aria-label={`Премахни ${line.title} от количката`}
                          onClick={() => removeLine(line.lineId)}
                          className="mt-1 text-[11px] font-semibold text-boutique-accent underline-offset-4 transition hover:text-boutique-ink hover:underline"
                        >
                          Премахни
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-2xl border border-boutique-line bg-boutique-paper p-5 shadow-boutique-sm lg:sticky lg:top-28 lg:p-6">
            <h2 className="font-heading text-2xl text-boutique-ink">
              {content["cart.summary_title"]}
            </h2>
            <div className="mt-5 space-y-3 border-y border-boutique-line py-4 text-sm">
              <div className="flex justify-between gap-4 text-boutique-muted">
                <span>Артикули</span>
                <span>{itemCount}</span>
              </div>
              <div className="flex justify-between gap-4 text-boutique-muted">
                <span>Доставка</span>
                <span>Уточнява се</span>
              </div>
            </div>
            <div className="mt-5 flex items-baseline justify-between gap-4">
              <span className="font-semibold text-boutique-ink">Общо</span>
              <span className="font-heading text-3xl text-boutique-ink">
                {formatEur(subtotal)}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-boutique-muted">
              {content["cart.shipping_note"]}
            </p>
            <Link
              href="/checkout"
              className="mt-6 flex w-full justify-center rounded-xl bg-boutique-sage-deep px-5 py-3.5 text-sm font-semibold text-boutique-on-sage transition hover:bg-boutique-ink"
            >
              {content["cart.checkout_button"]}
            </Link>
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-boutique-muted">
              <span aria-hidden>✓</span>
              <span>{content["cart.payment_note"]}</span>
            </div>
          </aside>
        </div>
      </PageContainer>
    </section>
  );
}
