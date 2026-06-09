"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";
import { PageContainer } from "@/components/layout/page-container";
import { formatEur } from "@/lib/format-eur";

export function CartPanel() {
  const { lines, subtotal, setQuantity, removeLine } = useCart();

  if (lines.length === 0) {
    return (
      <section className="pb-24 pt-8">
        <PageContainer>
          <div className="rounded-2xl border border-boutique-line bg-boutique-paper px-8 py-16 text-center shadow-boutique-sm">
            <p className="font-heading text-2xl text-boutique-ink">Количката е празна</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-boutique-muted">
              Разгледайте магазина и добавете нещо специално.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex rounded-full bg-boutique-ink px-8 py-3.5 text-sm font-semibold tracking-wide text-boutique-paper transition hover:bg-boutique-accent"
            >
              Към продуктите
            </Link>
          </div>
        </PageContainer>
      </section>
    );
  }

  return (
    <section className="pb-24 pt-8">
      <PageContainer>
        <ul className="divide-y divide-boutique-line/90 overflow-hidden rounded-2xl border border-boutique-line bg-boutique-paper shadow-boutique">
          {lines.map((line) => (
            <li
              key={line.lineId}
              className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
            >
              <div className="max-w-xl space-y-2">
                <p className="font-heading text-lg text-boutique-ink">{line.title}</p>
                {line.personalization ? (
                  <p className="text-sm text-boutique-muted">
                    <span className="font-medium text-boutique-ink/80">Персонализация: </span>
                    «{line.personalization}»
                  </p>
                ) : null}
                {line.selectedColors && line.selectedColors.length > 0 ? (
                  <div className="space-y-1 text-sm text-boutique-muted">
                    <p className="font-medium text-boutique-ink/80">Избрани цветове:</p>
                    <ul className="space-y-1">
                      {line.selectedColors.map((item) => (
                        <li key={`${line.lineId}-${item.groupId}-${item.optionId}`} className="flex items-center gap-2">
                          <span>{item.fieldLabel}: {item.optionName}</span>
                          {item.optionHex ? (
                            <span
                              aria-hidden
                              className="h-3.5 w-3.5 rounded-full border border-boutique-line"
                              style={{ backgroundColor: item.optionHex }}
                            />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="text-sm text-boutique-muted">
                  {formatEur(line.price)} · брой: {line.quantity}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                  Количество
                  <input
                    type="number"
                    min={1}
                    max={99}
                    aria-label={`Количество за ${line.title}`}
                    value={line.quantity}
                    onChange={(e) => setQuantity(line.lineId, Number(e.target.value))}
                    className="w-20 rounded-lg border border-boutique-line bg-boutique-bg px-3 py-2 text-sm text-boutique-ink outline-none transition focus:border-boutique-accent/50"
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Премахни ${line.title} от количката`}
                  onClick={() => removeLine(line.lineId)}
                  className="text-xs font-semibold uppercase tracking-wider text-boutique-accent underline-offset-4 transition hover:text-boutique-ink hover:underline"
                >
                  Премахни
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-10 rounded-2xl border border-boutique-line bg-boutique-paper p-6 shadow-boutique-sm sm:flex sm:items-center sm:justify-between sm:gap-6 md:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-muted">
              Междинна сума
            </p>
            <p className="mt-2 font-heading text-3xl text-boutique-ink">{formatEur(subtotal)}</p>
            <p className="mt-2 text-xs text-boutique-muted">
              Доставката се уточнява при финализиране на поръчката.
            </p>
          </div>
          <Link
            href="/checkout"
            className="mt-6 inline-flex rounded-full bg-boutique-ink px-8 py-3.5 text-sm font-semibold tracking-wide text-boutique-paper transition hover:bg-boutique-accent sm:mt-0"
          >
            Продължи към поръчка
          </Link>
        </div>
      </PageContainer>
    </section>
  );
}
