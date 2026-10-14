"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { ContentImage } from "@/components/content/content-image";
import type { EventRow } from "@/lib/admin/types";

export function HomePastEvents({ events }: { events: EventRow[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const trackId = useId();
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const updateArrows = () => {
      setCanGoBack(track.scrollLeft > 2);
      setCanGoForward(track.scrollLeft + track.clientWidth < track.scrollWidth - 2);
    };
    const observer = new ResizeObserver(updateArrows);
    observer.observe(track);
    track.addEventListener("scroll", updateArrows, { passive: true });
    updateArrows();

    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", updateArrows);
    };
  }, [events.length]);

  function move(direction: number) {
    const track = trackRef.current;
    if (!track) return;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * (track.clientWidth + gap),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-boutique-muted">Минали събития</h3>
        <div className="flex shrink-0 gap-2">
          <button type="button" aria-label="Предишни минали събития" title="Предишни събития" aria-controls={trackId} disabled={!canGoBack} onClick={() => move(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-boutique-line bg-white text-xl text-boutique-ink transition hover:border-boutique-sage-deep disabled:cursor-default disabled:opacity-30">
            <span aria-hidden>←</span>
          </button>
          <button type="button" aria-label="Следващи минали събития" title="Следващи събития" aria-controls={trackId} disabled={!canGoForward} onClick={() => move(1)} className="grid h-10 w-10 place-items-center rounded-full border border-boutique-line bg-white text-xl text-boutique-ink transition hover:border-boutique-sage-deep disabled:cursor-default disabled:opacity-30">
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
      <div
        id={trackId}
        ref={trackRef}
        role="region"
        aria-label="Минали събития"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
        className="mt-3 grid min-w-0 auto-cols-[100%] grid-flow-col gap-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:auto-cols-[calc((100%-1rem)/2)] lg:auto-cols-[calc((100%-2rem)/3)] xl:auto-cols-[calc((100%-3rem)/4)]"
      >
        {events.map((event) => (
          <article key={event.id} className="min-w-0 snap-start">
            <Link href={`/sabitiya/${event.slug}`} className="group flex h-full items-center gap-3 border-b border-boutique-line/70 py-3">
              <div className="h-16 w-20 shrink-0 overflow-hidden rounded-md bg-boutique-warm">
                <ContentImage src={event.image_url} alt={event.title} label="Снимка от събитието" />
              </div>
              <div className="min-w-0">
                {event.starts_at ? <p className="text-xs text-boutique-muted"><time dateTime={event.starts_at}>{new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeZone: "Europe/Sofia" }).format(new Date(event.starts_at))}</time></p> : null}
                <h4 className="mt-1 break-words text-sm font-medium leading-snug text-boutique-ink transition group-hover:text-boutique-sage-deep">{event.title}</h4>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
