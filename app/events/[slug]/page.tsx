import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";

import { EventDetailView } from "@/components/content/event-detail-view";
import {
  getPublishedEvent,
  getPublishedEvents,
} from "@/lib/content/repository";
import { OG_DEFAULTS } from "@/lib/seo/social-images";

type EventPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);
  if (!event) return { title: "Събитието не е намерено", robots: { index: false } };
  return {
    title: event.title,
    description: event.excerpt,
    alternates: { canonical: `/sabitiya/${slug}` },
    openGraph: {
      type: "article",
      ...OG_DEFAULTS,
      title: event.title,
      description: event.excerpt,
      url: `/sabitiya/${slug}`,
      images: event.image_url ? [{ url: event.image_url, alt: event.title }] : undefined,
    },
    twitter: {
      card: event.image_url ? "summary_large_image" : "summary",
      title: event.title,
      description: event.excerpt,
      images: event.image_url ? [event.image_url] : undefined,
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const [event, events] = await Promise.all([
    getPublishedEvent(slug),
    getPublishedEvents(),
  ]);
  if (!event) notFound();
  const relatedEvents = events
    .filter((candidate) => candidate.slug !== slug && Boolean(candidate.starts_at) && new Date(candidate.starts_at!).getTime() > Date.now())
    .sort((a, b) => Number(b.event_type === event.event_type) - Number(a.event_type === event.event_type))
    .slice(0, 3);

  return (
    <EventDetailView
      event={event}
      relatedEvents={relatedEvents}
      idempotencyKey={randomUUID()}
    />
  );
}
