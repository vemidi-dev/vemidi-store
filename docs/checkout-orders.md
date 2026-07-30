# Checkout и поръчки

## Количка → checkout

1. Клиентът добавя продукти (с опции/цветове/персонализация/quantity).
2. `/cart` преглед и корекции на количества.
3. `/checkout` — клиентски данни, доставка, privacy consent, optional coupon.
4. Server action създава поръчка чрез Supabase RPC `create_store_order` (service client).
5. Redirect към `/thank-you` + order confirmation payload в sessionStorage.
6. Analytics purchase bridge (при consent).

## Валидации (фактически)

- Privacy consent е задължителен.
- Cart lines се валидират (опции, personalization).
- Idempotency key (UUID v4) + rate limiting fingerprint.
- Coupon optional (`discount_coupons`).

Грешките се локализират през `lib/checkout/errors.ts`.

## Плащане

**Само наложен платеж (`cash_on_delivery`).**  
Картов gateway **не е намерен** в checkout пътя. Site copy също подчертава, че не се въвеждат данни за карта.

## Доставка

Куриери:

- **Econt** — office / automat / address; live API за градове/офиси (`/api/shipping/econt/...`).
- **Speedy** — form fields за office/address; **live Speedy API не е намерен** под `lib/shipping` (**за проверка** UX спрямо очакванията).

## Inventory при checkout

За `stocked` продукти RPC намалява наличност атомарно (виж inventory hardening SQL).  
Освобождаване при cancel — **за проверка / вероятно неимплементирано** (според SQL коментари).

## Quantity tiers при checkout

Има SQL/checkout support за quantity price tiers (`product_quantity_price_tiers_checkout.sql`). Cart вече преизчислява unit price преди submit; **за проверка** пълното съвпадение cart vs RPC при всички edge cases.

## Thank-you / нотификации

- `/thank-you` е `noindex`.
- Order notifications през outbox + Resend; cron retry: `/api/cron/retry-order-notifications` (`CRON_SECRET`).

## Campaign checkout

- Landing → store handoff cookie/API.
- Може да създава/попълва конфигурация и да води към checkout.
- Поръчките могат да имат source store vs landing в admin филтрите.

## Admin поръчки

Tab `orders`:

- Филтри по статус, дата, source, payment, delivery, search.
- Смяна на статус: `new` → `confirmed` → `making` → `shipped` → `completed` / `cancelled`.
- Детайли на редове (опции, персонализация, deltas).
- Notification delivery badges.
- CSV export.
- Delete order (оперативен риск).

## Withdrawals

Публична форма `/withdrawal` → admin tab `withdrawals` със статуси new/reviewing/accepted/rejected/completed.

## Рискове

- Двойно submit без idempotency защита би бил проблем — има ключове, но ops трябва да следят дубликати.
- Cancel след stock decrement без release.
- PII в CSV експорт.
- Грешен delivery payload → проблем при изпълнение (не при card charge, понеже COD).
