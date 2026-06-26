"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { formatEur } from "@/lib/format-eur";

type CartAddedToastProps = {
  title: string;
  imageSrc?: string;
  price: number;
  quantity: number;
  onDismiss: () => void;
};

export function CartAddedToast({
  title,
  imageSrc,
  price,
  quantity,
  onDismiss,
}: CartAddedToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-3 transition-all duration-300 ease-out sm:bottom-8 sm:justify-end sm:px-8 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl border border-boutique-sage/30 bg-boutique-paper shadow-[0_24px_60px_-18px_rgb(44_40_37_/0.35)]"
      >
        <div className="flex items-center gap-3 border-b border-boutique-line px-4 py-3">
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-boutique-sage-deep text-sm font-bold text-white"
          >
            ✓
          </span>
          <p className="flex-1 text-sm font-semibold text-boutique-ink">
            Добавено в количката
          </p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Затворете известието"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xl leading-none text-boutique-muted transition hover:bg-boutique-bg hover:text-boutique-ink"
          >
            ×
          </button>
        </div>

        <div className="flex gap-4 p-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-boutique-line bg-boutique-bg">
            {imageSrc ? (
              <Image src={imageSrc} alt="" fill sizes="80px" className="object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-2xl text-boutique-muted">
                ◇
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-heading text-lg leading-snug text-boutique-ink">
              {title}
            </p>
            <p className="mt-1 text-sm text-boutique-muted">
              {quantity} бр. · {formatEur(price * quantity)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl border border-boutique-line px-3 py-3 text-xs font-semibold text-boutique-ink transition hover:bg-white"
          >
            Продължете
          </button>
          <Link
            href="/cart"
            onClick={onDismiss}
            className="rounded-xl bg-boutique-sage-deep px-3 py-3 text-center text-xs font-semibold text-white transition hover:bg-boutique-ink"
          >
            Към количката
          </Link>
        </div>
      </div>
    </div>
  );
}
