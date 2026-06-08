-- Restore table privileges required by SECURITY INVOKER admin product RPCs.
-- RLS policies from admin_auth.sql continue to restrict writes to admin_users.

grant insert, update, delete on public.products to authenticated;
grant insert, update, delete on public.product_categories to authenticated;
grant insert, update, delete on public.product_color_fields to authenticated;
grant insert, update, delete on public.product_color_field_options to authenticated;

-- Refresh PostgREST's schema cache after privilege/function changes.
notify pgrst, 'reload schema';
