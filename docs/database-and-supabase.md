# Database и Supabase

## Роля на Supabase

- Postgres данни + RLS
- Auth (admin users)
- Storage (публични изображения)
- RPC за атомарни операции (create product/update, create_store_order, gallery attach, …)

SQL файловете живеят в `supabase/*.sql` и се прилагат **ръчно**.

## Източник на истина за миграции

1. `docs/SUPABASE_MIGRATIONS.md` — номериран ред за core (#1–#36+).
2. Допълнителни feature SQL файлове в `supabase/` (quantity tiers, materials, publication, upsells, FAQ, site media, blog categories, CTA/personalization, related categories, …).

**За проверка:** кои файлове реално са приложени на Preview vs Production (няма автоматичен drift check в този doc).

## Типични RLS модели

- `public.is_admin(auth.uid())` за admin write/read.
- Public SELECT с филтри (`status = 'published'`, `is_active`, visibility rules).
- Checkout insert през service-role RPC; анонимни клиенти не пишат директно в `orders`.
- Helper SQL за grants: `restore_storefront_read_grants.sql`, `restore_admin_product_write_grants.sql`.

## Ключови домейни (таблици/области)

| Област | Примери |
|--------|---------|
| Продукти | products, images, options, personalization, wishes, promotions, upsells, landing pages |
| Категории | categories (+ related categories), types product/occasion/material |
| Цветове | color_groups, color_options |
| Материали | product_materials + option value links |
| Поръчки | orders / store order items, coupons, notification outbox |
| Блог/събития | blog_posts, blog_categories, events, event_gallery_images, registrations |
| Съдържание | site_content, site media keys |
| FAQ | faq groups/items + product attach |
| Абонати | newsletter_subscribers |
| Withdrawals | withdrawal requests |
| Admin | admin_users |

Точните имена на колони/RPC са в съответните `.sql` файлове — при съмнение четете SQL + `lib/admin/types.ts`.

## Storage

- Bucket: **`product-images`** (`storage_product_images.sql`).
- Public read; admin write.
- MIME: JPEG/PNG/WebP; bucket limit документиран около 5 MB (app profiles могат да имат по-строги/по-широки лимити преди upload).
- Prefixes: `products/`, `blog/`, `events/`, `categories/`, `site-content/`, … според image profiles.

Image pipeline (Sharp): `lib/images/*` — profiles `product`, `event_gallery`, `category`, `blog`, `hero`.

Някои по-стари cover uploads все още могат да ползват legacy `uploadAdminImage` (напр. blog/event covers, category images) — **за проверка** дали всички admin uploads са мигрирани към Sharp pipeline.

## Интеграционни тестове към DB

`npm run test:integration` изисква отделни test ENV (`SUPABASE_TEST_URL`, `SUPABASE_TEST_SECRET_KEY`) и съответни миграции. Не е част от `test:release`.

## Оперативни бележки

- Преди deploy на feature, която чете нова колона/RPC: приложете SQL първо.
- Data audit (`npm run data:audit`) чете live DB — ползвайте съзнателно (предпочитано staging).
