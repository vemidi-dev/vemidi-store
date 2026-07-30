# VeMiDi Crafts — обзор на проекта

Първа версия на функционална документация. Описва **реално налични** възможности в store приложението (`D:\Cursor\src`), без измислени функции. Неяснотите са маркирани с **за проверка**.

## Какво е проектът

VeMiDi Crafts е онлайн магазин за ръчно изработени / дървени продукти и заготовки, с:

- публичен **storefront** (Next.js App Router);
- админ панел за каталог, съдържание, поръчки и оперативни очереди;
- backend данни и auth през **Supabase** (Postgres + Storage + Auth + RPC);
- checkout с **наложен платеж** (без картово плащане в текущия поток).

Отделен проект за campaign landing страници (`butterfly-landing`) **не е част** от този repo. Store приложението обаче поддържа handoff към/от campaign checkout.

## Технологичен стек (фактическо)

| Слой | Технология |
|------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Backend/DB | Supabase (Postgres, RLS, Storage, Auth) |
| Images | Sharp pipeline + bucket `product-images` |
| Email (поръчки) | Resend outbox + cron retry (**за проверка:** production конфигурация) |
| Analytics | Google Analytics 4 + Meta Pixel (с cookie consent) |
| Hosting (документирано) | Vercel (`docs/DEPLOYMENT.md`) |

## Основни потребителски потоци

1. **Разглеждане** — каталог `/produkti`, категории, поводи, материали/заготовки.
2. **Конфигурация на продукт** — размер/материал/опции, цвят, количество, персонализация, prepared variants.
3. **Количка → checkout** — доставка Econt/Speedy, privacy consent, създаване на поръчка чрез RPC.
4. **Съдържание** — блог, събития, FAQ, информационни страници.
5. **Админ** — управление на продукти, цени, промоции, поръчки, текстове, медиа.

## Канонични публични маршрути

Основна навигация е дефинирана в `config/site.ts`. Канонични пътища включват:

- `/` — начална
- `/produkti`, `/produkti/[slug]` — каталог и продукт
- `/categorii`, `/povodi`, `/zagotovki-i-materiali` (+ `[slug]`)
- `/blog`, `/sabitiya`
- `/za-nas`, `/kontakti`
- `/delivery`, `/returns`, `/withdrawal`, `/terms`, `/privacy`, `/cookies`
- `/cart`, `/checkout`, `/thank-you`

Legacy EN пътища (`/shop`, `/products`, `/about`, …) се пренасочват с **308** към BG канонични URL (`middleware` + SEO helpers).

## Къде е какво в документацията

| Файл | Тема |
|------|------|
| [admin-panel.md](./admin-panel.md) | Админ секции, настройки, рискове |
| [storefront-features.md](./storefront-features.md) | Публичен сайт |
| [product-system.md](./product-system.md) | Продукти, опции, цени, inventory |
| [blog-system.md](./blog-system.md) | Блог editor, категории, inline images |
| [checkout-orders.md](./checkout-orders.md) | Количка, checkout, поръчки |
| [database-and-supabase.md](./database-and-supabase.md) | SQL, RLS, storage |
| [tests-and-release.md](./tests-and-release.md) | Тестове и release gate |
| [operations.md](./operations.md) | Deploy, ENV, оперативни команди |
| [changelog-functional.md](./changelog-functional.md) | Функционален changelog (кратък) |

Съществуват и по-стари/технически docs (`DEPLOYMENT.md`, `SUPABASE_MIGRATIONS.md`, `release-checklist.md`, SEO/security audits). При конфликт за **release тестовете** доверявайте се на `scripts/release-tests.mjs` (checklist-ът може да е частично остарял).

## Принципи при работа с кода (екипни)

- SQL миграциите се прилагат **ръчно** в Supabase.
- Не се commit-ват `.codex-handoff.md`, `.tmp-*`, ENV файлове, `next-env.d.ts`.
- Не се пипа `butterfly-landing` от store задачите.
- Prefериран pre-production gate: `npm run test:release`.
