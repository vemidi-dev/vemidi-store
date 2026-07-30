# Функционален changelog (кратък)

Това не е пълен git history. Обобщава **наскоро документирани / налични** функционални области според кода и handoff бележките. Дати са ориентировъчни спрямо текущата работа по branch `codex/product-page-ux-refactor`.

## 2026-07 — Product page UX, pricing, blog images

### Quantity pricing

- Quantity tiers на продукт.
- Cart групира отстъпки по purchasable variant (product + options), **не** само по `productId`.
- Различен цвят споделя tier; различен материал/размер — не.
- Prepared variants summary ползва същата group логика.

### Product page UX

- Material-stock layout: ред qty → tiers → personalization (desktop запазен; mobile пренареден).
- Mobile: акордеони над configurator; цветове до опциите; sticky CTA („Добави избора“ / „Добави X бр. в количката“).
- Quantity input позволява временно празно поле за писане от клавиатура.

### Merchandising / copy

- Ready product CTA.
- Related products copy („Може да харесате“).
- Price summary label за stock: „Цена за този продукт“.

### Blog

- Inline images в rich text editor (`![alt](url)`).
- Upload през Sharp `blog` profile към `product-images`.
- Preview + storefront render с `next/image`.

## По-рано налични големи модули (без точна дата тук)

- Универсални product options + validation.
- Personalization fields + wish templates.
- Color palette / quantity color mode.
- Product materials library + option material links.
- Upsells + `upsell_only` visibility.
- Promotion campaigns + discount coupons.
- Publication status (draft/published/archived) + admin preview.
- Inventory fulfillment (stocked / made_to_order / unavailable).
- Store checkout COD + Econt API + Speedy form.
- Campaign handoff / landing checkout integration.
- Blog + events + event gallery + registrations.
- FAQ management (global/product).
- Site content keys + site media heroes.
- Newsletter subscribers list/export.
- Withdrawals queue.
- Consent Mode + GA4 + Meta Pixel.
- Canonical BG SEO routes + sitemap/robots.
- Related categories.
- Data audit script.

## За проверка / не е changelog-нато тук

- Пълен списък от всички SQL миграции и кога са влезли в production.
- Дали всички image uploads са на Sharp pipeline (част от covers все още може да са legacy).
- Speedy live API.
- Customer account scope.
- Newsletter sending pipeline.
