# Task report — Product JSON Import v2 spec

Дата: 2026-08-30  
Проект: `D:\Cursor\src` (vemidi-dev/vemidi-store)  
Статус: **Planning complete** — spec only, no implementation  
Deploy: **не**  
Template: **не е пипан**

---

## Задача

Подготовка на спецификация за бъдещ **Product JSON Import v2** — batch draft import на продукти с JSON + image bundle, без UI и без schema changes в тази стъпка.

---

## Изпълнено

| Deliverable | Path |
|-------------|------|
| v2 contract + flow spec | `docs/product-json-import-v2.md` |
| Task report | `docs/task-reports/2026-08-30-product-json-import-v2-spec.md` |

---

## Прочетени източници

| Source | Purpose |
|--------|---------|
| `D:\velly\site\darvena-liniyka-s-ime-moliv.json` | v1 reference / example product |
| `components/admin/product-create-panel.tsx` | Admin create UX fields |
| `app/admin/actions.ts` (`createProduct`) | Create flow, validation order, gallery attach |
| `lib/admin/form-fields.ts` | Field name contract |
| `lib/admin/types.ts` | ProductRow, draft, personalization types |
| `lib/admin/product-rpc.ts` | `createProductAtomic` / RPC payload |
| `lib/admin/product-image-upload.ts` | Image validation + upload pipeline |

---

## Ключови решения в spec-а

1. **v2 contract** с `version: 2`, required `primary_category`, formal image matching.
2. **Create-only, always draft** — no publish, no update, no category creation.
3. **Categories by slug** — resolve to IDs; primary must be `product` or `material` type.
4. **`promo_code_eligible`** — documented as existing DB/admin field (default `true`); not tied to promo WIP implementation.
5. **Images** — match `original_filename` (basename, case-insensitive); `alt` required; first/`primary` → hero.
6. **`product_code` in JSON** — advisory only until RPC supports override (current `VM-XXXXXX` auto-gen).
7. **7-step import flow** — JSON → images → validate → preview → create drafts → gallery → summary.

---

## Какво НЕ е направено (нарочно)

- Admin UI за import
- Server actions / API routes
- Supabase migrations
- Commit на promo_code_eligible WIP (`D:\Cursor\src\supabase\product_promo_code_eligible.sql` и свързани файлове остават **локални, непипани**)
- Deploy / template port
- Commit на `.tmp-*`, `.codex-handoff.md`

---

## Promo WIP

Локалните промени по `promo_code_eligible` в `D:\Cursor\src` **не са включени** в тази задача. Spec-ът документира полето `promo_code_eligible` като **съществуващо** product поле в codebase (`lib/admin/types.ts`, `createProduct` post-update), без да имплементира или deploy-ва promo SQL/logic.

---

## Следваща стъпка (извън scope)

1. Admin UI panel + import server action
2. JSON/Zod validator module (`lib/admin/product-json-import-v2.ts`)
3. Решение за `product_code` override vs auto VM codes
4. Tests: parser, category resolve, image match, happy path mock

---

## Verification

- [x] Spec covers required sections from task brief
- [x] Example v2 JSON for „Дървена линийка с име – Молив“
- [x] ChatGPT generator prompt included
- [x] No code/schema changes
- [x] Promo WIP untouched
