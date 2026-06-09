import type { Metadata } from "next";
import Link from "next/link";

import { PurchaseEventBridge } from "@/components/analytics/purchase-event-bridge";
import { PageContainer } from "@/components/layout/page-container";

export const metadata: Metadata = {
  title: "Благодарим за поръчката",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <main className="py-16 md:py-24">
      <PurchaseEventBridge />
      <PageContainer>
        <section className="mx-auto max-w-2xl rounded-3xl border border-boutique-line bg-boutique-paper px-7 py-14 text-center shadow-boutique-sm md:px-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-boutique-accent">
            Поръчката е приета
          </p>
          <h1 className="font-heading mt-5 text-4xl text-boutique-ink sm:text-5xl">
            Благодарим ви!
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-boutique-muted">
            Ще се свържем с вас за потвърждение на детайлите и срока за изработка.
            Плащането е с наложен платеж при получаване.
          </p>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-boutique-muted">
            Ако сте посочили имейл, следете и папката за нежелана поща.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/shop"
              className="rounded-full bg-boutique-ink px-8 py-3 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
            >
              Разгледай още продукти
            </Link>
            <Link
              href="/"
              className="rounded-full border border-boutique-line px-8 py-3 text-sm font-semibold text-boutique-ink transition hover:border-boutique-accent"
            >
              Към началната страница
            </Link>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
