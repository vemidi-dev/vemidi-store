# Тестове и release

## Основни npm скриптове

| Команда | Какво прави |
|---------|-------------|
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | всички `tests/**/*.test.ts` |
| `npm run test:integration` | integration тестове (live test DB) |
| `npm run test:release` | **pre-production gate**: typecheck + targeted groups |
| `npm run test:release:unit` | release groups без typecheck |
| `npm run test:release:data` | `data:audit` (live DB) |
| `npm run lint` | ESLint |
| `npm run build` | Next production build (не е част от `test:release`) |
| `npm run env:check` | проверка на required ENV |
| `npm run supabase:check` | smoke към Supabase |
| `npm run smoke:preview` | HTTP smoke срещу preview URL |

## `npm run test:release` — групи

Авторитетен списък: `scripts/release-tests.mjs` (по-актуален от старите секции в `release-checklist.md`).

1. Pricing, cart & quantity tiers  
2. Product page UX & copy  
3. Admin merchandising & category filters  
4. Admin & product lifecycle  
5. Checkout & orders  
6. Consent & analytics  
7. Data audit (unit)  
8. Related categories  
9. SEO & routes  

Примерни важни regression теми в suite-а:

- quantity tier grouping (material vs color)
- prepared variants summary pricing
- product page mobile order / sticky CTA
- publish validation / publication status
- checkout validation / order confirmation payloads
- consent mode + GA/Meta без PII
- canonical `/produkti` routes

## Какво НЕ покрива `test:release`

- Full `next build`
- Live data audit
- Integration inventory checkout
- Ръчен UI преглед на admin/PDP
- Deploy/promote

## Препоръчан flow преди commit

```bash
npm run test:release
```

При нужда от по-широк обхват:

```bash
npm test
npm run lint
```

Build само когато промяната го изисква (image config, routing layout, production-only issues).

## Изключения от commit

Не включвайте: `.codex-handoff.md`, `.tmp-*`, ENV, `next-env.d.ts`, butterfly-landing.

## За проверка

- `docs/release-checklist.md` §1 все още споменава по-стар брой файлове — при разминаване следвайте `release-tests.mjs`.
