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

## Бележки

Старите untracked scratch файлове не са пипани.
