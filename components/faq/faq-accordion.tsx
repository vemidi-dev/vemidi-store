"use client";

import { useId, useState, type KeyboardEvent } from "react";

import { withPlainTextClass } from "@/lib/plain-text";
import type { FaqItem } from "@/lib/faq/types";

type FaqAccordionProps = {
  items: FaqItem[];
  idPrefix?: string;
  className?: string;
};

const answerClassName =
  "pb-4 pt-1 text-base leading-7 text-boutique-muted md:leading-[1.75]";

export function FaqAccordion({ items, idPrefix, className = "" }: FaqAccordionProps) {
  const generatedPrefix = useId().replace(/:/g, "");
  const prefix = idPrefix ?? `faq-${generatedPrefix}`;
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  if (!items.length) {
    return null;
  }

  const itemIds = items.map((item) => `${prefix}-${item.id}`);

  function toggleItem(itemId: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  function handleQuestionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();
    const offset = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (index + offset + items.length) % items.length;
    const nextButton = document.getElementById(itemIds[nextIndex] ?? "");
    nextButton?.focus();
  }

  return (
    <div className={className}>
      {items.map((item, index) => {
        const buttonId = itemIds[index] ?? `${prefix}-${item.id}`;
        const panelId = `${buttonId}-panel`;
        const isOpen = openIds.has(item.id);

        return (
          <div
            key={item.id}
            className="border-b border-boutique-line/70 last:border-b-0"
          >
            <h3 className="m-0">
              <button
                id={buttonId}
                type="button"
                className="flex w-full items-start justify-between gap-4 py-4 text-left text-base font-semibold leading-snug text-boutique-ink transition-colors hover:text-boutique-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-boutique-paper"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleItem(item.id)}
                onKeyDown={(event) => handleQuestionKeyDown(event, index)}
              >
                <span className="min-w-0 flex-1">{item.question}</span>
                <span
                  aria-hidden
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-boutique-line/80 text-boutique-sage-deep transition-transform duration-200 motion-reduce:transition-none ${
                    isOpen ? "rotate-45" : "rotate-0"
                  }`}
                >
                  <span className="text-lg leading-none">+</span>
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              aria-hidden={!isOpen}
              className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className={withPlainTextClass(answerClassName)}>{item.answer}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
