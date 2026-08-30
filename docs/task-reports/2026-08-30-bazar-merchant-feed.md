# Bazar.bg Merchant Feed

Дата: 2026-08-30  
Repo: `vemidi-dev/vemidi-store`  
Branch: `feat/bazar-merchant-feed`

## Endpoint

- **URL:** `/api/merchant/bazar.xml`
- **Format:** Google Shopping RSS/XML (`xmlns:g="http://base.google.com/ns/1.0"`)
- **Auth:** публичен GET
- **Cache:** `public, s-maxage=300, stale-while-revalidate=600`

Съществуващият Google feed `/api/merchant/google.xml` **не е променен**.

## Цел

Отделен feed за Bazar.bg с **същите продукти, идентификатори и търговски полета** като Google feed-а, но с **форматирано plain-text описание**, оптимизирано за четимост в Bazar.

## Reuse

| Споделено от Google feed | Bazar-specific |
|--------------------------|----------------|
| eligibility filter | `resolveBazarMerchantDescription()` |
| `buildGoogleMerchantFeedItem()` (base item) | `buildBazarMerchantFeedItem()` override на `description` |
| `renderGoogleMerchantItemXml()` | `buildBazarMerchantFeedXml()` |
| price, availability, images, brand, product_type | — |

## Bazar `g:description` структура

Plain text, без HTML, с празен ред между блоковете. Продуктовите блокове са **без label-и**, за да не изглежда описанието като техническа таблица в Bazar:

```
[products.name / title]

[subtitle]                  ← admin „Кратко резюме“

[dimensions_materials]

[description — абзаци запазени, HTML премахнат]

Разгледайте продукта тук:
[product link от feed item]

Facebook:
https://www.facebook.com/profile.php?id=100090185474431

Магазин:
https://vemidi-crafts.com

Изпращаме с Еконт и Спиди до цялата страна.
```

### Полета, които влизат

- `name` / `title`
- `subtitle` → „Кратко резюме“
- `dimensions_materials` → „Размери и материали“
- `description` → „За продукта“
- product link (същият като `g:link`)
- фиксирани footer редове: Facebook, магазин URL, shipping line

### Форматиране

- `g:description` се рендерира като CDATA, за да се запазят реалните нови редове.
- Всеки продуктов блок е отделен с един празен ред.
- Footer labels за линковете (`Разгледайте продукта тук`, `Facebook`, `Магазин`) остават, защото помагат в обявата.

### Полета, които **не** влизат

- `personalization_info`
- `ordering_info`
- `additional_info`
- SEO / OG (`meta_*`, `og_*`)
- рекламни клишета
- измислена информация при липсващи стойности

Празни optional секции се **пропускат** (без label и без излишни празни редове).

## Непроменени спрямо Google feed

За всеки `<item>`:

- `g:id`
- `g:title`
- `g:link`
- `g:image_link`
- `g:additional_image_link`
- `g:price`
- `g:availability`
- `g:product_type`
- `g:brand`
- `g:condition`
- `g:mpn` (when present)
- `g:identifier_exists`

## Файлове

| Path | Роля |
|------|------|
| `lib/merchant/bazar-feed.ts` | Bazar description builder + feed XML |
| `app/api/merchant/bazar.xml/route.ts` | Public route |
| `lib/storefront/repository.ts` | + `dimensions_materials` в catalog select |
| `tests/bazar-merchant-feed.test.ts` | Unit/route contract tests |

## Tests

```
npm run typecheck
tests/bazar-merchant-feed.test.ts
tests/google-merchant-feed.test.ts   (regression — google unchanged)
```

## Deploy

- **Production:** не е deploy-нат (по задача)
- **PR:** #38
- **Preview:** https://vemidi-store-or6ny95uo-ve-mi-di.vercel.app/api/merchant/bazar.xml (`dpl_ELSoQcwKJWBN1oyud7f61mVeYxVZ`)
