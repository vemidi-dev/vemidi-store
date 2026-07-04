"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { CartLineSummaryDetails } from "@/components/cart/cart-line-summary-details";
import { getProductPath } from "@/lib/product-url";
import { isCartQuantityAtLimit, resolveCartQuantityLimit } from "@/lib/cart/quantity-limits";
import { PageContainer } from "@/components/layout/page-container";
import { formatEur } from "@/lib/format-eur";
import type { CartPageContent } from "@/lib/content/site-content";
import type { ProductUpsellOffer } from "@/lib/storefront/product-upsells";

type CartUpsellOffersResponse = {
  offersByProductId?: Record<string, ProductUpsellOffer[]>;
};

export function CartPanel({ content }: { content: CartPageContent }) {
  const { lines, itemCount, subtotal, addProduct, setQuantity, removeLine } =
    useCart();
  const [offersByProductId, setOffersByProductId] = useState<
    Record<string, ProductUpsellOffer[]>
  >({});
  const mainProductIds = useMemo(
    () => [...new Set(lines.filter((line) => !line.upsell).map((line) => line.productId))],
    [lines],
  );

  useEffect(() => {
    if (mainProductIds.length === 0) {
      setOffersByProductId({});
      return;
    }

    let isActive = true;
    fetch("/api/cart-upsells", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: mainProductIds }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: CartUpsellOffersResponse | null) => {
        if (isActive) {
          setOffersByProductId(data?.offersByProductId ?? {});
        }
      })
      .catch(() => {
        if (isActive) {
          setOffersByProductId({});
        }
      });

    return () => {
      isActive = false;
    };
  }, [mainProductIds]);

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
              href="/produkti"
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
                href="/produkti"
                className="text-xs font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
              >
                {content["cart.continue_shopping"]}
              </Link>
            </div>

            <ul className="divide-y divide-boutique-line/90 overflow-hidden rounded-2xl border border-boutique-line bg-boutique-paper shadow-boutique-sm">
              {lines.map((line) => {
                const quantityLimit = resolveCartQuantityLimit(line.maxCartQuantity);
                const atLimit = isCartQuantityAtLimit(line.quantity, line.maxCartQuantity);

                return (
                <li key={line.lineId} className="p-4 sm:p-5">
                  <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[7rem_minmax(0,1fr)_auto]">
                    <Link
                      href={getProductPath(line.slug)}
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
                      <Link href={getProductPath(line.slug)}>
                        <h3 className="font-heading text-base leading-snug text-boutique-ink transition hover:text-boutique-sage-deep sm:text-lg">
                          {line.title}
                        </h3>
                      </Link>
                      <p className="mt-1 text-sm font-semibold text-boutique-sage-deep">
                        {formatEur(line.price)}
                      </p>

                      <CartLineSummaryDetails line={line} className="mt-3" />

                      {!line.upsell && offersByProductId[line.productId]?.length ? (
                        <details
                          open
                          className="mt-3 rounded-xl border border-boutique-line bg-white px-3 py-2"
                        >
                          <summary className="cursor-pointer text-xs font-semibold text-boutique-sage-deep">
                            Специална оферта към този продукт
                          </summary>
                          <div className="mt-3 grid gap-2">
                            {offersByProductId[line.productId].map((offer) => {
                              const isAdded = lines.some(
                                (cartLine) =>
                                  cartLine.upsell?.offerId === offer.id &&
                                  cartLine.upsell.sourceProductId === line.productId,
                              );
                              const image = offer.product.images.find(
                                (item) => item.src,
                              );

                              return (
                                <div
                                  key={offer.id}
                                  className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-boutique-line/70 bg-boutique-bg/40 p-2"
                                >
                                  <Link
                                    href={getProductPath(offer.product.slug)}
                                    className="relative aspect-square overflow-hidden rounded-md border border-boutique-line bg-white"
                                  >
                                    {image ? (
                                      <Image
                                        src={image.src}
                                        alt={image.alt ?? offer.product.title}
                                        fill
                                        sizes="48px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <span className="grid h-full w-full place-items-center text-sm text-boutique-muted">
                                        в—‡
                                      </span>
                                    )}
                                  </Link>
                                  <span className="min-w-0">
                                    <Link href={getProductPath(offer.product.slug)}>
                                      <span className="block truncate text-xs font-semibold text-boutique-ink transition hover:text-boutique-sage-deep">
                                        {offer.title ?? offer.product.title}
                                      </span>
                                    </Link>
                                    <span className="mt-0.5 block text-xs text-boutique-muted">
                                      {formatEur(offer.specialPrice)}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    disabled={isAdded || !offer.product.orderable}
                                    onClick={() =>
                                      addProduct(
                                        offer.product,
                                        offer.suggestedQuantity,
                                        undefined,
                                        undefined,
                                        undefined,
                                        undefined,
                                        undefined,
                                        {
                                          unitPrice: offer.specialPrice,
                                          maxCartQuantity: offer.maxQuantity,
                                          suppressToast: true,
                                          upsell: {
                                            offerId: offer.id,
                                            sourceProductId: line.productId,
                                            sourceProductTitle: line.title,
                                            originalPrice: offer.product.price,
                                            specialPrice: offer.specialPrice,
                                          },
                                        },
                                      )
                                    }
                                    className="rounded-lg bg-boutique-sage-deep px-3 py-2 text-xs font-semibold text-white transition hover:bg-boutique-ink disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isAdded ? "Добавено" : "Добавете"}
                                  </button>
                                </div>
                              );
                            })}
                            <Link
                              href={`${getProductPath(line.slug)}#product-upsell-title`}
                              className="text-xs font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
                            >
                              Разгледайте на продуктовата страница
                            </Link>
                          </div>
                        </details>
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
                          max={quantityLimit}
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
                          disabled={atLimit}
                          onClick={() => setQuantity(line.lineId, line.quantity + 1)}
                          className="grid h-9 w-9 place-items-center text-lg text-boutique-muted transition hover:text-boutique-ink disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      {atLimit ? (
                        <p className="mt-2 text-xs text-boutique-muted">
                          Достигнахте наличното количество за този продукт.
                        </p>
                      ) : null}

                      <div className="text-right">
                        <p className="font-heading text-lg text-boutique-ink">
                          {formatEur(line.price * line.quantity)}
                        </p>
                        <button
                          type="button"
                          aria-label={`Премахване на ${line.title} от количката`}
                          onClick={() => removeLine(line.lineId)}
                          className="mt-1 text-[11px] font-semibold text-boutique-accent underline-offset-4 transition hover:text-boutique-ink hover:underline"
                        >
                          Премахване
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
                );
              })}
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
                <span className="text-right">По тарифа на куриера</span>
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
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
              <Link
                href="/delivery"
                className="text-boutique-sage-deep underline-offset-4 hover:underline"
              >
                Доставка и плащане
              </Link>
              <Link
                href="/returns"
                className="text-boutique-sage-deep underline-offset-4 hover:underline"
              >
                Връщане и рекламации
              </Link>
            </div>
            <Link
              href="/checkout"
              className="mt-6 flex w-full justify-center rounded-xl bg-boutique-sage-deep px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-boutique-ink"
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
