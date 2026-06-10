"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CartAddedToastProps = {
  title: string;
  onDismiss: () => void;
};

export function CartAddedToast({ title, onDismiss }: CartAddedToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4 transition-all duration-300 ease-out sm:bottom-8 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-boutique-sage/30 bg-boutique-paper px-4 py-3.5 shadow-boutique sm:px-5 sm:py-4"
      >
        <span
          aria-hidden
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-boutique-sage/15 text-sm font-bold text-boutique-sage-deep"
        >
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-boutique-ink">Добавено в количката</p>
          <p className="mt-0.5 truncate text-sm text-boutique-muted">
            {`„${title}"`}
          </p>
          <Link
            href="/cart"
            onClick={onDismiss}
            className="mt-2 inline-flex text-xs font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
          >
            Към количката →
          </Link>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Затвори известието"
          className="shrink-0 rounded-full px-2 py-1 text-lg leading-none text-boutique-muted transition hover:bg-boutique-bg hover:text-boutique-ink"
        >
          ×
        </button>
      </div>
    </div>
  );
}
