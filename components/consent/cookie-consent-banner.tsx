"use client";

import Link from "next/link";

type CookieConsentBannerProps = {
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onOpenSettings: () => void;
};

export function CookieConsentBanner({
  onAcceptAll,
  onRejectAll,
  onOpenSettings,
}: CookieConsentBannerProps) {
  return (
    <section
      aria-label="Съгласие за бисквитки"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-boutique-line/80 bg-boutique-bg/95 shadow-[0_-12px_40px_rgba(44,36,32,0.12)] backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:px-8 md:flex-row md:items-end md:justify-between md:gap-6 md:py-5">
        <div className="max-w-3xl space-y-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-boutique-sage-deep">
            Бисквитки
          </p>
          <p className="text-sm leading-relaxed text-boutique-ink">
            Използваме необходими бисквитки, за да работи сайтът. С ваше
            съгласие можем да добавим аналитични и маркетингови бисквитки в
            бъдещи версии. Можете да промените избора си по всяко време.
          </p>
          <Link
            href="/cookies"
            className="inline-flex text-xs font-semibold uppercase tracking-[0.16em] text-boutique-sage-deep underline-offset-4 transition hover:text-boutique-accent hover:underline"
          >
            Научете повече
          </Link>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-full border border-boutique-line px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
          >
            Настройки
          </button>
          <button
            type="button"
            onClick={onRejectAll}
            className="rounded-full border border-boutique-line px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
          >
            Отказвам всички
          </button>
          <button
            type="button"
            onClick={onAcceptAll}
            className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
          >
            Приемам всички
          </button>
        </div>
      </div>
    </section>
  );
}
