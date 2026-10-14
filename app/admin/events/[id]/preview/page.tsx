import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EventDetailView } from "@/components/content/event-detail-view";
import { EventPreviewBanner } from "@/components/content/event-preview-banner";
import type { EventRow } from "@/lib/admin/types";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AdminEventPreviewPageProps = {
  params: Promise<{ id: string }>;
};

async function requireAdminPreviewAccess(): Promise<
  NonNullable<Awaited<ReturnType<typeof createClient>>>
> {
  const supabase = await createClient();
  if (!supabase) {
    redirect(
      `/admin/login?message=${encodeURIComponent("Supabase не е конфигуриран.")}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/admin/login?message=${encodeURIComponent("Моля, влезте като администратор.")}`,
    );
  }

  const { isAdmin, error } = await checkIsAdmin(supabase, user.id);
  if (error || !isAdmin) {
    redirect(
      `/admin/login?message=${encodeURIComponent("Нямате достъп до администраторския преглед.")}`,
    );
  }

  return supabase;
}

async function loadEventPreview(id: string): Promise<EventRow | null> {
  const supabase = await requireAdminPreviewAccess();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return error ? null : (data as EventRow | null);
}

export async function generateMetadata({
  params,
}: AdminEventPreviewPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await loadEventPreview(id);

  return {
    title: event ? `Преглед: ${event.title}` : "Преглед на събитие",
    robots: { index: false, follow: false },
  };
}

export default async function AdminEventPreviewPage({
  params,
}: AdminEventPreviewPageProps) {
  const { id } = await params;
  const event = await loadEventPreview(id);

  if (!event) {
    notFound();
  }

  return (
    <EventDetailView
      event={event}
      includeStructuredData={false}
      previewBanner={<EventPreviewBanner isPublished={event.is_published} />}
    />
  );
}
