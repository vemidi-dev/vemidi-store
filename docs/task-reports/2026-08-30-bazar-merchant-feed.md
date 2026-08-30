# Bazar.bg Merchant Feed

Дата: 2026-08-30  
Repo: `vemidi-dev/vemidi-store`  
Branch: `feat/bazar-merchant-feed` → merged to `main` (`7ce9a8d`)

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
[subtitle]                  ← admin „Кратко резюме“

[dimensions_materials]

[description — абзаци запазени, HTML премахнат]

Разгледайте продукта тук: [product URL]<space>
Facebook: https://www.facebook.com/profile.php?id=100090185474431<space>
Магазин: https://vemidi-crafts.com<space>
Изпращаме с Еконт и Спиди до цялата страна.
Или вземете своята поръчка от място - Младост 2, София, след предварителна уговорка.
```

### Полета, които влизат

- `subtitle` → „Кратко резюме“
- `dimensions_materials` → „Размери и материали“
- `description` → „За продукта“
- product link (същият като `g:link`)
- фиксирани footer редове: Facebook URL, магазин домейн, shipping line, pickup line

### Форматиране

- `g:description` се рендерира като CDATA, за да се запазят реалните нови редове.
- Всеки продуктов блок е отделен с един празен ред.
- Footer редовете са компактни, защото Bazar визуализира отделните label/URL редове с прекалено големи разстояния.
- Bazar.bg не приема HTML (`<a href>`) в `g:description`. URL-ите се превръщат в линкове само от техния autolinker, който изисква разделител след адреса. Затова всеки URL във footer-а завършва с интервал (същият ръчен трик: space след линка).
- `Магазин` е пълен `https://` URL, за да може да се autolink-не (гол домейн без схема остава текст).

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

- **PR:** #38 — merged
- **Preview (pre-merge):** https://vemidi-store-or6ny95uo-ve-mi-di.vercel.app/api/merchant/bazar.xml (`dpl_ELSoQcwKJWBN1oyud7f61mVeYxVZ`)

## Production closure

- **Merge commit:** `7ce9a8d` — Merge pull request #38 from vemidi-dev/feat/bazar-merchant-feed
- **Production deployment:** `dpl_BTQcSsHhce3XktyRr6QWnvJkRJ8F`
- **Production URL:** https://vemidi-store-isd7wk4mm-ve-mi-di.vercel.app
- **Live aliases (production):**
  - https://vemidi-crafts.com
  - https://www.vemidi-crafts.com
  - https://vemidi-store.vercel.app
- **Live endpoint:** https://vemidi-crafts.com/api/merchant/bazar.xml
- **Google feed (unchanged):** https://vemidi-crafts.com/api/merchant/google.xml

### Live verification (2026-08-30)

| Check | Result |
|-------|--------|
| `bazar.xml` HTTP 200 | pass |
| `google.xml` HTTP 200 | pass |
| XML content-type + declaration + RSS channel | pass (both feeds) |
| Product count | **61** in both feeds |
| `g:id`, `g:title`, `g:link`, `g:image_link`, `g:price`, `g:availability`, `g:product_type` | match between feeds |
| `g:description` differs from Google | pass |
| Description has no HTML tags | pass |
| Description does not start with repeated product title | pass |
| Description includes product link block | pass |
| Description includes Facebook URL | pass |
| Description includes shop URL (`https://vemidi-crafts.com`) | pass |
| Description includes shipping line | pass |
| Google feed unchanged | pass |

Sample Bazar description opening (first item): subtitle → dimensions → product body, without repeated title prefix.

### Next operational step

Configure Bazar.bg merchant feed URL to:

**https://vemidi-crafts.com/api/merchant/bazar.xml**

## Compact footer links production closure

- **PR:** #40 — merged
- **Merge commit:** `e278c42` — Merge pull request #40 from vemidi-dev/codex/bazar-compact-footer-links
- **Feature commit:** `30db8c3` — fix(merchant): compact bazar footer links
- **Production deployment:** `dpl_FvMxqMv31AgyQNnHHxvRkVuDVzCP`
- **Production URL:** https://vemidi-store-8v69cgsz2-ve-mi-di.vercel.app
- **Live aliases (production):**
  - https://vemidi-crafts.com
  - https://www.vemidi-crafts.com
  - https://vemidi-store.vercel.app
- **Live endpoint:** https://vemidi-crafts.com/api/merchant/bazar.xml
- **Google feed (unchanged):** https://vemidi-crafts.com/api/merchant/google.xml

### Live verification (2026-08-30, post PR #40)

| Check | Result |
|-------|--------|
| `bazar.xml` HTTP 200 | pass |
| `google.xml` HTTP 200 | pass |
| XML content-type + declaration + RSS channel | pass (both feeds) |
| Product count | **61** in both feeds |
| `g:id`, `g:title`, `g:link`, `g:image_link`, `g:price`, `g:availability`, `g:product_type` | match between feeds |
| `g:description` differs from Google | pass |
| Description has no HTML tags | pass |
| No exact duplicate of `g:title` at description start | pass (0/61) |
| Footer links compact (`label: URL`, no line break between label and URL) | pass |
| Product body blocks separated by blank line | pass |
| Google feed unchanged | pass |

Sample live footer (first item):

```
Разгледайте продукта тук: https://vemidi-crafts.com/produkti/...
Facebook: https://www.facebook.com/profile.php?id=100090185474431
Магазин: vemidi-crafts.com
Изпращаме с Еконт и Спиди до цялата страна.
Или вземете своята поръчка от място - Младост 2, София, след предварителна уговорка.
```

### Final Bazar.bg feed URL

**https://vemidi-crafts.com/api/merchant/bazar.xml**

## Readable contact labels hotfix

- **Branch:** `codex/bazar-readable-contact-labels`
- **Reason:** Bazar.bg не превръща URL-ите в description в кликаеми линкове и пълният Facebook URL изглежда тежко в обявата.
- **Bazar-only change:** продуктовият URL остава в `g:description`; Facebook редът отново съдържа пълния Facebook URL, а магазинът остава кратък домейн `Магазин: vemidi-crafts.com`.
- **Google feed:** непроменен.

## Facebook URL restore hotfix

- **Branch:** `codex/bazar-restore-facebook-url`
- **Reason:** Bazar.bg не прави URL-ите в description кликаеми, но пълният Facebook адрес трябва да присъства като текст.
- **Bazar-only change:** footer блокът съдържа `Facebook: https://www.facebook.com/profile.php?id=100090185474431`.
- **Known platform limitation:** кликаемостта на URL-и вътре в описанието зависи от Bazar.bg. Feed-ът може да подаде URL като plain text, но не може да принуди Bazar да го визуализира като anchor link.

## Pickup line hotfix

- **Branch:** `codex/bazar-pickup-line`
- **Reason:** Bazar.bg показва описанието като plain text, затова финалният блок трябва да е информативен дори без кликаеми линкове.
- **Bazar-only change:** след shipping line се добавя отделен ред: `Или вземете своята поръчка от място - Младост 2, София, след предварителна уговорка.`
- **Google feed:** непроменен.

## Autolink trailing-space hotfix

- **Branch:** `fix/bazar-autolink-trailing-space`
- **Reason:** ръчна проверка в Bazar.bg — URL в края на реда се показва като текст; space след URL го прави кликаем.
- **Feed limitation:** `g:description` е plain text в CDATA. HTML `<a href>` не се използва (и би се показал като текст или би бил изчистен).
- **Bazar-only change:**
  - всеки footer URL завършва с интервал: `label: https://… `;
  - `Магазин` е `https://vemidi-crafts.com`, не гол домейн.
- **Google feed:** непроменен.
