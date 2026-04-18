-- Add optional product info fields for storefront details.
-- Run this once in Supabase SQL Editor.

alter table public.products
  add column if not exists additional_info text,
  add column if not exists fulfillment_note text;
