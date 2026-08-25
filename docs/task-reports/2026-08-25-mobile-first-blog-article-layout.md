# Mobile-first Blog Article Layout

Дата: 2026-08-25

## Обхват

Разработка на нов mobile-first layout за страниците на блог статии.

## Променени файлове

- `app/blog/[slug]/page.tsx`
- `lib/content/blog-rich-text.tsx`

## Какво е добавено

- Видим breadcrumb над статията: `Начало → Блог → категория`.
- Линк `← Всички статии` в горната част и финален линк към всички статии.
- По-компактен intro/header за мобилно четене.
- Mobile-first блок `В тази статия`, който се генерира автоматично от H2 заглавията.
- Anchor `id` за H2 заглавията в rich text съдържанието.
- Desktop sticky sidebar като надграждане над mobile layout-а.
- Sidebar блокове:
  - `В тази статия`
  - `Разгледайте по тема`
  - `Може да ви бъде интересно`
  - дискретна продуктова CTA карта
  - Pinterest/share блок
- Компактна продуктова секция след текста, максимум 3 продукта.
- Визуални карти за подобни статии.
- Предишна/следваща статия.

## SEO / структура

Съществуващите Article structured data са запазени.
BreadcrumbList structured data вече използва по-пълната пътека:

`Начало → Блог → категория → заглавие на статията`

## Проверки

- `npm run typecheck` — PASS

## Revision: article sidebar simplification

След първи преглед са нанесени UX корекции:

- Премахнат е блокът `В тази статия` от mobile и desktop layout-а.
- Sidebar/mobile tools вече започват с `Търсене`.
- `Разгледайте по тема` е преименувано на `Категории`.
- Премахната е sidebar картата `Подарък с лично послание`.
- Social/share блокът вече води основно към Facebook и Instagram.
- Премахната е навигацията `Предишна статия` / `Следваща статия`.
- `Подобни статии` е преименувано на `Още от тази категория`.
- Препоръчаните статии вече се филтрират само от същата блог категория.
- В blog index sidebar блока `Последвайте ни` placeholder буквите са заменени с реалните social SVG икони от `SocialLinks`.

Проверки след revision:

- `npm run typecheck` — PASS

Бележка: настройване на препоръчани статии от admin панела остава отделна по-голяма задача, защото изисква DB/admin модел за ръчно свързване на публикации.

## Бележки

Промяната е направена само в `D:\Cursor\src`.
Template-ът не е пипан в тази стъпка.

## Preview deployment

- **Commit hash:** `2d9657e`
- **Branch:** `codex/mobile-first-blog-article-layout`
- **PR:** https://github.com/vemidi-dev/vemidi-store/pull/23
- **Vercel Preview URL:** https://vemidi-store-git-codex-mobile-first-blog-articl-e00475-ve-mi-di.vercel.app
- **Typecheck:** PASS (`npm run typecheck`)
- **Production promote:** не е правен

## Preview revision

- **Commit hash:** `4ee537a`
- **Branch:** `codex/mobile-first-blog-article-layout`
- **PR:** https://github.com/vemidi-dev/vemidi-store/pull/23
- **Vercel Preview URL:** https://vemidi-store-git-codex-mobile-first-blog-articl-e00475-ve-mi-di.vercel.app
- **Typecheck:** PASS (`npm run typecheck`)
- **Production promote:** не е правен
- **Бележка:** admin-настройваеми препоръчани статии остават отделна бъдеща задача

## Recommendation copy + sidebar newsletter/social revision

### Променени файлове

- `supabase/blog_post_recommendation_copy.sql` — нова миграция
- `lib/admin/types.ts`
- `lib/admin/form-fields.ts`
- `app/admin/content-actions.ts`
- `components/admin/content-management-panel.tsx`
- `app/blog/[slug]/page.tsx`
- `app/blog/page.tsx` — SocialLinks с реални SVG икони в „Последвайте ни“
- `tests/article-schema.test.ts`
- `tests/blog-categories.test.ts`
- `docs/task-reports/2026-08-25-mobile-first-blog-article-layout.md`

### SQL

Миграция: `supabase/blog_post_recommendation_copy.sql`

Добавя nullable колони:
- `recommendation_title`
- `recommendation_description`

**SQL трябва да се изпълни ръчно в Supabase SQL Editor** преди admin save и storefront да ползват новите полета.

### Какво се променя в UX

- Текстовете над „Подходящи предложения“ се управляват от admin панела за всяка статия.
- Fallback заглавие: `Идеи към тази статия`.
- Ако description е празно, не се показва hardcoded gift copy.
- В sidebar (и на mobile след търсене/категории) се показват Newsletter + „Последвайте ни“ с реални social SVG икони.

### Проверки

- `npm run typecheck` — PASS
- Production promote: **не е правен**

## Preview: recommendation copy and sidebar revision

- **Commit hash:** `255a0d0`
- **Branch:** `codex/mobile-first-blog-article-layout`
- **PR:** https://github.com/vemidi-dev/vemidi-store/pull/23
- **Vercel Preview URL:** https://vemidi-store-git-codex-mobile-first-blog-articl-e00475-ve-mi-di.vercel.app
- **Typecheck:** PASS (`npm run typecheck`)
- **Unit tests:** PASS — `npx tsx --test tests/article-schema.test.ts tests/blog-categories.test.ts tests/blog-recommendations.test.ts` (14/14)
- **SQL migration:** `supabase/blog_post_recommendation_copy.sql`
- **Важно:** SQL трябва да се изпълни ръчно в Supabase преди admin полетата `recommendation_title` / `recommendation_description` да работят.
- **Production promote:** не е правен

## Product carousel + share label revision

- Продуктите в „Подходящи предложения“ вече не са ограничени до първите 3 — рендерират се всички избрани/свързани продукти.
- Използва се `BlogProductCarousel` с хоризонтален scroll и стрелки; в article страницата картите са `ProductCard variant="related"` чрез `cardVariant`.
- Facebook бутонът в „Споделете статията“ е преименуван от „Сподели във Facebook“ на „Facebook“.
- `npm run typecheck` — PASS
- Production promote: **не е правен**
