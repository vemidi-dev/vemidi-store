-- Phase 2: run only after the phase 1 migration and the matching application
-- deployment have both been verified in production.
-- Removes direct browser access to the legacy subscription RPCs.

revoke all on function public.subscribe_to_topics(text, text[]) from anon;
revoke all on function public.subscribe_to_topics(text, text[]) from authenticated;
revoke all on function public.subscribe_newsletter(text) from anon;
revoke all on function public.subscribe_newsletter(text) from authenticated;
