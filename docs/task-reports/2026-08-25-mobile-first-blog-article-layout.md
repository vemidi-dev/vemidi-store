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
