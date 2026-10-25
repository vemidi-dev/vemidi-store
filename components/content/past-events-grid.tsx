"use client";

import { ChevronDown, LoaderCircle } from "lucide-react";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { loadMorePastEvents } from "@/app/events/past-events-actions";

type PastEventCard = { id: string; content: ReactNode };

export function PastEventsGrid({ initialCards, totalCount, before }: {
  initialCards: PastEventCard[];
  totalCount: number;
  before: number;
}) {
  const [cards, setCards] = useState(initialCards);
  const [total, setTotal] = useState(totalCount);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const offset = useRef(initialCards.length);
  const loading = useRef(false);

  function loadMore() {
    if (loading.current) return;
    loading.current = true;
    setError("");
    startTransition(async () => {
      try {
        const next = await loadMorePastEvents(offset.current, before);
        offset.current += next.cards.length;
        setCards((current) => {
          const ids = new Set(current.map((card) => card.id));
          return [...current, ...next.cards.filter((card) => !ids.has(card.id))];
        });
        setTotal(next.totalCount);
      } catch {
        setError("Не успяхме да заредим събитията. Опитайте отново.");
      } finally {
        loading.current = false;
      }
    });
  }

  return <div className="mt-10">
    <div id="past-events-grid" aria-busy={isPending} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => <div key={card.id} className="min-w-0">{card.content}</div>)}
    </div>
    <div className="mt-6 text-center">
      <p role="status" className="text-sm text-boutique-muted">{cards.length} от {total} минали събития</p>
      {offset.current < total ? <button type="button" onClick={loadMore} disabled={isPending} aria-controls="past-events-grid" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-boutique-line bg-white px-5 py-2 text-sm font-semibold text-boutique-ink transition hover:border-boutique-sage-deep hover:text-boutique-sage-deep disabled:opacity-60">
        {isPending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ChevronDown aria-hidden="true" className="h-4 w-4" />}
        {isPending ? "Зареждане..." : "Покажи още"}
      </button> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  </div>;
}
