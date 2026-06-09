# Subscription Lists

The store keeps one row per email in `public.newsletter_subscribers`. The `topics` array determines
which audiences the subscriber belongs to:

- `products` - new products;
- `blog` - new blog articles;
- `events` - upcoming workshops.

## Public forms

Each subscription form starts with the most relevant topic selected. Visitors may also select one or
both of the other topics. Submitting the same email again adds the newly selected topics and
reactivates an inactive subscription.

## Admin management

Open `/admin?tab=subscribers` to:

- search by email;
- filter by audience or active status;
- change topic memberships;
- deactivate or reactivate a subscriber;
- export the active filtered audience as CSV.

The CSV export never includes inactive subscribers. It is protected by the same administrator check
as the rest of the admin panel and sends `Cache-Control: private, no-store`.

## Sending campaigns

The application currently manages consent and audiences but does not send bulk email itself. Export
the required active audience and import it into the chosen email provider. Always use that provider's
unsubscribe mechanism and periodically reflect unsubscribed addresses as inactive in the admin
panel.

Public forms are rate limited to 6 attempts per browser/network fingerprint per hour. The readable IP
address is not stored; the application reuses the privacy-safe HMAC fingerprint used by checkout.
Subscriptions are written through the server-only `subscribe_to_topics_server` RPC.

## Required database setup

Run these files in Supabase SQL Editor:

1. `supabase/subscription_topics.sql` if topic support has not already been applied through the latest
   `blog_and_events.sql`;
2. `supabase/subscription_admin_management.sql`.

For an existing live deployment, then follow the two-phase sequence in
`docs/SUPABASE_MIGRATIONS.md` to enable the server-only RPC before disabling the legacy public RPC.
