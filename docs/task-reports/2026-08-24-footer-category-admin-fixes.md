# Footer and Category Admin Fixes

Дата: 2026-08-24

## Обхват

Малки production fixes за VeMiDi store:

- премахнато дублиране на `Блог` и `Събития` във footer-а;
- подобрена обратна връзка при добавяне, редакция и преместване на категории в admin панела;
- запазва се активният category tab при преместване на категория.

## Променени файлове

- `components/layout/footer.tsx`
- `components/admin/admin-submit-button.tsx`
- `components/admin/category-management-panel.tsx`
- `components/admin/category-management-view.tsx`
- `app/admin/actions.ts`

## Детайли

Footer-ът вече разчита само на `siteConfig.footerLinks` за shop/footer линковете. Ръчно добавените втори линкове към `/blog` и `/sabitiya` са премахнати.

Admin формите за категории вече използват общия `AdminSubmitButton`, който показва pending текст и блокира повторно натискане, докато заявката се обработва. Добавен е и `AdminFormPendingGuard` с видимо съобщение при добавяне и редакция.

При преместване на категория нагоре/надолу формите подават `category_type`, а server action-ът връща обратно към същия tab чрез `categoryType` query параметър.

## Проверки

- `npm run typecheck` — PASS

## Preview deployment

*(2026-08-24)*

| Поле | Стойност |
|------|----------|
| Branch | `codex/footer-category-admin-fixes` |
| Commit | `d3b9028` — `fix: polish footer links and category admin feedback` |
| PR | [#22](https://github.com/vemidi-dev/vemidi-store/pull/22) — **MERGED** |
| Vercel Preview | https://vemidi-store-git-codex-footer-category-admin-fixes-ve-mi-di.vercel.app — **Ready** |
| Vercel Inspector | https://vercel.com/ve-mi-di/vemidi-store/2goLX8e1g6PV6LFUgaZNGV98fm5V |
| Typecheck | PASS |

## Production deployment

*(2026-08-24)*

| Поле | Стойност |
|------|----------|
| PR | [#22](https://github.com/vemidi-dev/vemidi-store/pull/22) — **MERGED** |
| Merge commit | `1684f10` — `Merge pull request #22 from vemidi-dev/codex/footer-category-admin-fixes` |
| Feature commit | `d3b9028` |
| Production deploy | https://vemidi-store-5xvvxfz4r-ve-mi-di.vercel.app — **Ready** / Production |
| Vercel Inspector | https://vercel.com/ve-mi-di/vemidi-store/HvpZ9fJDk7Rq8jJmpnST7puQM9w1 |
| Typecheck | PASS (преди merge) |

### Какво е проверено

- PR #22 съдържа само task файловете + report (6 файла)
- release-tests + Vercel Preview SUCCESS преди merge
- Scratch `.tmp-*` / `.codex-handoff.md` **не** са включени
- Production deployment Ready (~55s) след merge

### Ръчна smoke проверка (препоръчително на живия сайт)

1. Footer: `Блог` и `Събития` по веднъж
2. Admin → Категории: pending при add/edit
3. Admin → Категории: ↑/↓ запазва активния tab

## Бележки

Старите untracked scratch файлове не са пипани.
