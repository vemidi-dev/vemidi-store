# Storefront — публични функции

## Навигация и маршрути

Канонични BG URL-и (виж `config/site.ts`):

- Начало, продукти, категории, поводи, заготовки/материали
- Събития, блог, за нас, контакти
- Информационни: доставка, връщания, отказ от договор, условия, поверителност, бисквитки
- Количка / checkout / thank-you

Legacy EN пътища се пренасочват с **308** (`middleware` + `lib/seo/middleware-redirects.ts`), напр.:

- `/shop` → `/produkti`
- `/products/[slug]` → `/produkti/[slug]`
- `/about` → `/za-nas`, `/contact` → `/kontakti`, `/events` → `/sabitiya`

## Каталог и филтри

- `/produkti` — каталог на публикувани продукти.
- Категорийни хъбове с listing + SEO съдържание.
- Related categories блок на категория.
- Product cards: цена, badge, промо етикети, availability hints.

**Скрити от каталог:** `draft`/`archived`; `visibility=upsell_only` (остават достъпни като upsell оферти).

## Продуктова страница (PDP)

Типични елементи (в зависимост от конфигурацията):

- Галерия (вкл. sync с option images при non-material layout).
- Заглавие, heading subtitle, subtitle, occasion tags, цена, availability.
- Ready product CTA (ако е включен).
- Информационни акордеони (описание, персонализация, размери, поръчка, доп. инфо).
- Конфигуратор: опции, цветове, количество, quantity tiers, персонализация.
- Prepared variants („Избрани варианти“) за stocked + quantity selector.
- Upsell секция.
- Related products („Може да харесате“).
- FAQ (ако е прикачен).
- Service blocks от site/product copy.
- Sticky mobile action bar (prepare / add to cart).

Подробности за ценообразуване и inventory: [product-system.md](./product-system.md).

## Количка

- Client cart (`cart-storage`, cart provider).
- Quantity updates с quantity-tier групиране по purchasable variant (не само `productId`; цветът не разделя групата).
- Linked upsell quantity limits.
- Campaign attribution на line (ако идва от handoff).

## Checkout и thank-you

Виж [checkout-orders.md](./checkout-orders.md). Накратко: privacy consent, Econt/Speedy, cash on delivery, RPC `create_store_order`, thank-you + analytics purchase bridge.

## Блог и събития

- `/blog`, `/blog/[slug]` — статии, featured/popular, related, product carousel.
- `/sabitiya`, `/sabitiya/[slug]` — събития + gallery + регистрационен UX (**за проверка:** пълен booking flow спрямо capacity).

## Информационни страници и SEO

- Meta/canonical/OG за info страници.
- `sitemap.ts`, `robots.ts` (disallow на admin/cart/checkout/account/login/…).
- Breadcrumbs + JSON-LD (Product, Article, …).
- Product slug history redirects при смяна на slug.

## Consent и analytics

- Cookie banner / prefs (`vemidi_cookie_consent`).
- Google Consent Mode + GA loader при analytics consent.
- Meta Pixel при marketing consent.
- Ecommerce events без PII (slug/price/qty).

ENV: `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID` — **за проверка** дали са зададени на Preview/Production.

## Campaign handoff

- `/campaign-checkout`, `/api/campaign-checkout`.
- Cookie/secret based handoff от landing към store cart/checkout.
- Landing HTML е в отделен repo — **за проверка** текущ production deploy процес.

## Акаунт / login

Съществуват маршрути `/login`, `/account`. Обхватът на customer account спрямо admin auth е **за проверка** (не е фокус на admin panel docs).
