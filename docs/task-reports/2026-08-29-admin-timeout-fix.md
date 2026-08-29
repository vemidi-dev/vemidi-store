# Admin panel Vercel 504 timeout — диагностика и fix

Дата: 2026-08-29  
Проект: `D:\Cursor\src` (vemidi-store)  
Статус: **merged + production**  
Template: **не е пипан**  
Promo `promo_code_eligible` deploy: **не е включен** (остава само локално WIP)  

## PR / deploy

| Item | Value |
|------|--------|
| PR | https://github.com/vemidi-dev/vemidi-store/pull/28 |
| Merge commit | `4240870` |
| Preview URL | https://vemidi-store-r50xw49ku-ve-mi-di.vercel.app |
| Production deployment | https://vemidi-store-bl7guj6cx-ve-mi-di.vercel.app (`dpl_8ekXjHVrgrbVrSTgCPhGUkPwKn5k`) |
| Production aliases | `vemidi-crafts.com`, `www.vemidi-crafts.com` → новият production deploy |

## Кой URL timeout-ва (преди fix)

От Vercel production logs (`vemidi-crafts.com`):

| Request | Status | Бележка |
|---------|--------|---------|
| `GET /admin` | **504** `FUNCTION_INVOCATION_TIMEOUT` (60s) | Default products tab + `loadAdminData` |
| `GET /admin` | понякога **200** | Intermittent |

Няма 504 за леките tab-ове в същия прозорец.

## Причина

Bare `/admin` → tab **products** → `loadAdminData()` (~24 unbounded queries) → Vercel 60s timeout.

## Fix (само тези файлове в PR #28)

1. `normalizeAdminTab`: празен/непознат → **`orders`**
2. `makeAdminTabHref`: винаги `/admin?tab=…`
3. Login → `/admin?tab=orders`
4. Update-password success → `/admin?tab=orders&success=…`

Файлове в commit: `lib/admin/params.ts`, `app/admin/login/actions.ts`, `app/admin/update-password/actions.ts`, `tests/seo-editor-mvp.test.ts`, `docs/task-reports/2026-08-29-admin-timeout-fix.md`.

**Не** включени: promo_code_eligible / coupon / cart / product checkbox / SQL.

### Residual risk

`/admin?tab=products` и `/admin?tab=categories` все още викат `loadAdminData` и могат да timeout-ват.

## Тестове (pre-merge)

```text
npm run typecheck                         → pass
npx tsx --test tests/seo-editor-mvp.test.ts → 9/9 pass
GitHub release-tests + Vercel Preview     → pass
```

## Smoke резултати

Unauthenticated (redirect към login; важното е **без 504** и бърз отговор):

| URL | Preview | Production (`vemidi-crafts.com`) |
|-----|---------|----------------------------------|
| `/admin` | 307 ≈ 1.8s | 307 ≈ 1.8s |
| `/admin?tab=orders` | 307 ≈ 0.7s | 307 ≈ 0.7s |

Забележка: без admin session smoke-ът не зарежда orders UI, но потвърждава, че serverless handler-ът вече не виси 60s на bare `/admin`. След login очакваният landing tab е **Поръчки**.

## Deploy бележки

- Vercel Git production deploy след merge е Ready.
- Custom domains бяха ръчно alias-нати към новия production deploy (както при предишни production pin-ове).
