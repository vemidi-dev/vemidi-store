# Операции (deploy, ENV, дневна работа)

## Pre-production (store)

Предпочитан gate:

```bash
npm run test:release
```

Опционално преди promote:

```bash
npm run env:check
npm run supabase:check
npm run smoke:preview -- --base-url=<preview-url>
npm run test:release:data   # само със съзнателен DB target
```

Пълен класически пакет (ако е нужен):

```bash
npm run env:check && npm test && npm run lint && npm run typecheck && npm run supabase:check && npm run build
```

## Deploy (документирано)

Вижте също `docs/DEPLOYMENT.md` и `docs/release-checklist.md`.

Обобщение от docs:

- Hosting: Vercel
- Production branch: `main` (според deployment doc)
- Preview → smoke → promote
- SQL миграции **преди** код, който ги изисква
- Rollback: Vercel previous deployment + внимателно с необратими SQL

**За проверка:** актуален production domain status и дали Preview ползва същите ENV като Production.

## ENV имена (без стойности)

### Required (`env:check`)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY`
- `CHECKOUT_RATE_LIMIT_SECRET`
- `NEXT_PUBLIC_SITE_URL`

### Често срещани допълнителни

- `SUPABASE_SERVICE_ROLE_KEY` (legacy alias)
- `SUPABASE_TEST_URL`, `SUPABASE_TEST_SECRET_KEY`
- `NEXT_PUBLIC_LANDING_BASE_URL`
- `CAMPAIGN_HANDOFF_SECRET`, `CAMPAIGN_HANDOFF_ALLOWED_ORIGINS`
- `CRON_SECRET`
- `RESEND_API_KEY`, `ORDER_NOTIFICATION_FROM`, `ORDER_NOTIFICATION_TO`
- `ECONT_API_USERNAME`, `ECONT_API_PASSWORD` (+ aliases)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`
- `DISABLE_IMAGE_OPTIMIZATION` / `NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION`
- `BASE_URL`, `SMOKE_PATHS` (smoke)

## SQL операции

- Изпълняват се ръчно от човек в Supabase.
- Агентите/CI не трябва да „промотират“ SQL към production автоматично в стандартния workflow.
- След нова feature SQL: проверете admin load messages (FAQ/colors/materials/… показват липсваща миграция).

## Storage / images

- Един основен public bucket: `product-images`.
- Оптимизация през Sharp profiles.
- Не качвайте секрети в storage.

## Landing проект

Campaign landings са извън `src` (`butterfly-landing`). Store поддържа handoff/API; deploy на landing е отделен процес — **за проверка**.

## Инциденти / типични проверки

| Симптом | Къде да гледате |
|---------|-----------------|
| Admin tab празен / SQL error | съответната миграция + RLS |
| Продукт липсва в каталог | status, visibility, sold_out |
| Грешна цена в cart | tiers grouping, option deltas |
| Checkout fail | RPC, stock, validation, rate limit |
| Няма имейл за поръчка | Resend ENV + outbox/cron |
| Счупени снимки | bucket URL, next image remotePatterns |

## Безпечност (кратко)

- Admin само през `admin_users`.
- Orders write през service RPC.
- Consent преди analytics.
- Не commit-вайте `.env*`.
