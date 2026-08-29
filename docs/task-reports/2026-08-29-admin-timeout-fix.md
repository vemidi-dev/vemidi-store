# Admin panel Vercel 504 timeout — диагностика и fix

Дата: 2026-08-29  
Проект: `D:\Cursor\src` (vemidi-store)  
Статус: **минимален fix приложен локално**  
Template: **не е пипан**  
Promo `promo_code_eligible` deploy: **не е продължен** (запазени локални промени)  
Vercel preview/production deploy на този fix: **не е правен**

## Кой URL timeout-ва

От Vercel production logs (`vemidi-crafts.com`, последните ~24h):

| Request | Status | Бележка |
|---------|--------|---------|
| `GET /admin` | **504** `FUNCTION_INVOCATION_TIMEOUT` (60s) | Повтарящи се; default products tab |
| `GET /admin` | понякога **200** | Intermittent — при по-бърз cold/warm path все пак минава |

Пример от logs (production):

```text
15:17:40  GET /admin  504  Vercel Runtime Timeout Error: Task timed out after 60 seconds
15:17:29  GET /admin  504  …
15:16:05  GET /admin  504  …
```

Няма 504 записи в същия прозорец за `?tab=orders|blog|content|promotions|…` — само bare `/admin`.

## Кои tab-ове работят (по код + logs)

В `app/admin/page.tsx` леките tab-ове имат **early return** и **не** викат `loadAdminData`:

| Tab | Зареждане | Очакване |
|-----|-----------|----------|
| `orders` | `loadOrdersPage` (paginated) | Лек — OK |
| `content` | `site_content` + `site_media` | Лек — OK |
| `blog` / `events` | content table queries | Лек — OK |
| `promotions` | products (тесен select) + campaigns/coupons | Умерен — OK |
| `categories` | **`loadAdminData`** | Тежък — риск като products |
| `products` (default преди fix) | **`loadAdminData`** | Тежък — **причина за 504** |
| `faq`, `wishes`, `subscribers`, `seo`, `colors`, `materials`, `withdrawals` | собствени queries | Леки/умерени |

`maxDuration = 60` вече е зададен на admin page — лимитът се удря от тежестта на `loadAdminData`, не от липсващ timeout config.

## Причина

1. Bare `/admin` (и login redirect към `/admin`) се нормализираше към tab **`products`**.
2. Products/categories path вика `loadAdminData()` (`lib/admin/data.ts`): **~24 параллелни** unbounded Supabase selects (`products.select("*")`, всички `product_images`, option groups/values, FAQ links, upsells, landing pages, …).
3. Това често надхвърля Vercel serverless **60s** → `FUNCTION_INVOCATION_TIMEOUT` / 504.
4. Известен риск и в `docs/PRE_PRODUCTION_AUDIT.md` (PostgREST 1000-row cap + липса на pagination).

## Какъв fix е направен (минимален)

Без пипане на `loadAdminData` / promo_code_eligible:

1. **`normalizeAdminTab`**: празен/непознат tab → **`orders`** вместо `products`.
2. **`makeAdminTabHref`**: винаги `/admin?tab=…` (вкл. products → `/admin?tab=products`), за да не се бърка bare `/admin` с products.
3. Login redirect → `/admin?tab=orders`.
4. Update-password success → `/admin?tab=orders&success=…`.

Файлове:

- `lib/admin/params.ts`
- `app/admin/login/actions.ts`
- `app/admin/update-password/actions.ts`
- `tests/seo-editor-mvp.test.ts`

### Residual risk (не в този минимален fix)

- `/admin?tab=products` и `/admin?tab=categories` **все още** викат пълния `loadAdminData` и могат да timeout-ват.
- Следваща стъпка (отделно): pagination / lazy load за products admin (както в PRE_PRODUCTION_AUDIT D1/D10).

## Тестове

```text
npx tsc --noEmit
npx tsx --test tests/seo-editor-mvp.test.ts
```

Очакван резултат: typecheck pass; нов тест за default tab → `orders` + `makeAdminTabHref("products")`.

## Deploy

**Не е правен** preview/production deploy в тази стъпка. След review: deploy само на timeout fix (или заедно с други готови промени по преценка) — **без** да се разчита на още неизпълнената `promo_code_eligible` SQL миграция за admin timeout.
