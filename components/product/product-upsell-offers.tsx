"use client";

import Image from "next/image";
import { useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { formatEur } from "@/lib/format-eur";
import type { Product } from "@/lib/catalog";
import type { ProductUpsellOffer } from "@/lib/storefront/product-upsells";

type ProductUpsellOffersProps = {
  sourceProduct: Product;
  offers: ProductUpsellOffer[];
};

function clampQuantity(value: number, maxQuantity: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(maxQuantity, Math.max(1, Math.trunc(value)));
}

function requiresConfiguredMainProduct(product: Product) {
  return Boolean(
    product.customizable ||
      product.personalizationFields?.length ||
      product.colorFields?.some((field) => field.minSelect > 0) ||
      product.optionGroups?.some((group) => group.isActive && group.isRequired),
  );
}

export function ProductUpsellOffers({
  sourceProduct,
  offers,
}: ProductUpsellOffersProps) {
  const { addProduct, lines } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      offers.map((offer) => [offer.id, offer.suggestedQuantity]),
    ),
  );
  const [addedOfferId, setAddedOfferId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!offers.length) {
    return null;
  }

  return (
    <section
      aria-labelledby="product-upsell-title"
      className="mt-6 rounded-2xl border border-boutique-line bg-boutique-bg/70 p-4 shadow-boutique-sm sm:p-5"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-boutique-accent">
          Специална оферта
        </p>
        <h2
          id="product-upsell-title"
          className="mt-1 font-heading text-2xl text-boutique-ink"
        >
          Добавете към подаръка
        </h2>
      </div>

      <div className="mt-4 grid gap-3">
        {offers.map((offer) => {
          const image = offer.product.images.find((item) => item.src);
          const quantity = clampQuantity(
            quantities[offer.id] ?? offer.suggestedQuantity,
            offer.maxQuantity,
          );
          const canAdd = offer.product.orderable;

          return (
            <article
              key={offer.id}
              className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 rounded-xl border border-boutique-line bg-boutique-paper p-3 sm:grid-cols-[6rem_minmax(0,1fr)]"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg border border-boutique-line bg-white">
                {image ? (
                  <Image
                    src={image.src}
                    alt={image.alt ?? offer.product.title}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-xl text-boutique-muted">
                    ◇
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="text-base font-semibold leading-snug text-boutique-ink">
                  {offer.title ?? offer.product.title}
                </h3>
                {offer.description ? (
                  <p className="mt-1 text-sm leading-5 text-boutique-muted">
                    {offer.description}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-heading text-2xl text-boutique-sage-deep">
                    {formatEur(offer.specialPrice)}
                  </span>
                  {offer.product.price > offer.specialPrice ? (
                    <span className="text-sm text-boutique-muted line-through">
                      {formatEur(offer.product.price)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div
                    className="inline-flex items-center rounded-lg border border-boutique-line bg-white"
                    aria-label={`Количество за ${offer.product.title}`}
                  >
                    <button
                      type="button"
                      aria-label="Намали количеството"
                      onClick={() =>
                        setQuantities((current) => ({
                          ...current,
                          [offer.id]: clampQuantity(quantity - 1, offer.maxQuantity),
                        }))
                      }
                      className="grid h-9 w-9 place-items-center text-lg text-boutique-muted transition hover:text-boutique-ink"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={offer.maxQuantity}
                      value={quantity}
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [offer.id]: clampQuantity(
                            Number(event.target.value),
                            offer.maxQuantity,
                          ),
                        }))
                      }
                      className="h-9 w-10 border-x border-boutique-line bg-transparent text-center text-sm text-boutique-ink outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Увеличи количеството"
                      disabled={quantity >= offer.maxQuantity}
                      onClick={() =>
                        setQuantities((current) => ({
                          ...current,
                          [offer.id]: clampQuantity(quantity + 1, offer.maxQuantity),
                        }))
                      }
                      className="grid h-9 w-9 place-items-center text-lg text-boutique-muted transition hover:text-boutique-ink disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={() => {
                      const hasMainProductInCart = lines.some(
                        (line) =>
                          line.productId === sourceProduct.id && !line.upsell,
                      );
                      if (
                        !hasMainProductInCart &&
                        requiresConfiguredMainProduct(sourceProduct)
                      ) {
                        setNotice(
                          "Първо добавете основния продукт с избраните опции, след това добавете специалната добавка.",
                        );
                        return;
                      }

                      if (!hasMainProductInCart) {
                        addProduct(sourceProduct, 1);
                      }

                      addProduct(
                        offer.product,
                        quantity,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        {
                          unitPrice: offer.specialPrice,
                          upsell: {
                            offerId: offer.id,
                            sourceProductId: sourceProduct.id,
                            sourceProductTitle: sourceProduct.title,
                            originalPrice: offer.product.price,
                            specialPrice: offer.specialPrice,
                          },
                        },
                      );
                      setAddedOfferId(offer.id);
                      setNotice(
                        hasMainProductInCart
                          ? "Добавката е добавена към количката."
                          : "Добавихме основния продукт и специалната добавка като комплект.",
                      );
                    }}
                    className="min-h-10 rounded-xl bg-boutique-sage-deep px-5 text-sm font-semibold text-white transition hover:bg-boutique-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {addedOfferId === offer.id ? "Добавено" : "Добавете"}
                  </button>
                </div>

                {!canAdd ? (
                  <p className="mt-2 text-xs text-boutique-muted">
                    Този артикул временно не може да бъде добавен.
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {notice ? (
        <p className="mt-3 rounded-xl border border-boutique-line bg-white px-4 py-3 text-sm text-boutique-muted">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
