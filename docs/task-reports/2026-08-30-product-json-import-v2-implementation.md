# Task report — Product JSON Import v2 implementation plan

Дата: 2026-08-30  
Проект: `vemidi-dev/vemidi-store`  
Spec: [PR #33](https://github.com/vemidi-dev/vemidi-store/pull/33) (merged → `main`) → `docs/product-json-import-v2.md`  
Статус: **Phase 3 Preview QA ready** — merged to main, preview deployed; production **не** е промотиран  
Deploy: **не**  
Template: **не**  
Promo WIP (`D:\Cursor\src\supabase\product_promo_code_eligible.sql` и свързани локални промени): **не се включва**

---

## Цел на MVP

Admin flow в таб **Products** за batch **create-only** import на продукти като **чернови** от JSON v2 + image bundle, с preview/validation преди DB writes и summary след import.

MVP следва contract-а в `docs/product-json-import-v2.md` и **reuse-ва** съществуващите pipeline-и:

- `createProductAtomic` / `admin_create_product_v11` (`lib/admin/product-rpc.ts`)
- Post-create `products` update (draft, visibility, tiers, …) — mirror на `createProduct` в `app/admin/actions.ts`
- `validateProductImageUploadBatch` → `processAndUploadProductImages` → `admin_attach_product_images` (`lib/admin/product-image-upload.ts`)

---

## Архитектурен подход

### Принципи

1. **Pure lib module** за parse/validate/map — unit-testable без Supabase.
2. **Отделен server actions файл** — не раздува `app/admin/actions.ts` (~2.3k lines).
3. **Extract на shared create+gallery pipeline** — import и manual create споделят една функция; без copy-paste на 150 lines от `createProduct`.
4. **Два server round-trips** — validate (read-only DB) + import (writes); files остават в browser до confirm.
5. **Per-product continue** по подразбиране — failed продукт не спира останалите (strict all-or-nothing = post-MVP).

### Layer diagram

```
ProductJsonImportPanel (client wizard)
        │
        ├─► lib/admin/product-json-import-v2/*  (parse, validate, map, match-images)
        │
        ├─► validateProductJsonImport()         (server: slug/category DB checks)
        │
        └─► importProductsFromJson()              (server: create drafts + gallery)
                │
                └─► lib/admin/product-create-pipeline.ts  (shared with createProduct)
                        ├─ createProductAtomic
                        ├─ products post-update
                        ├─ processAndUploadProductImages
                        └─ attachProductImages
```

---

## Файлове — добавяне / промяна

### Нови файлове

| Path | Отговорност |
|------|-------------|
| `lib/admin/product-json-import-v2/types.ts` | `ProductImportFileV2`, `ProductImportV2`, `ImageImportV2`, `ImportDefaults`, validation/import result types, error codes |
| `lib/admin/product-json-import-v2/parse.ts` | `parseProductJsonImportFile(raw: string)` — JSON parse, version gate |
| `lib/admin/product-json-import-v2/validate-sync.ts` | Sync validation: slugs, price, fields, personalization, tiers overlap, image rules, duplicate slugs in file |
| `lib/admin/product-json-import-v2/validate-async.ts` | DB: slug exists, category slug resolve, primary_category type check |
| `lib/admin/product-json-import-v2/match-images.ts` | `normalizeImageBasename`, `sortProductImages`, `matchProductImagesToFiles`, unused-file detection |
| `lib/admin/product-json-import-v2/map-to-mutation.ts` | JSON product → `ProductMutationInput` + post-create fields |
| `lib/admin/product-json-import-v2/constants.ts` | Limits: max products (25), max JSON size (2 MB), max images per product |
| `lib/admin/product-create-pipeline.ts` | `createProductDraftWithGallery()` — extracted from `createProduct` |
| `app/admin/product-import-actions.ts` | `validateProductJsonImport`, `importProductsFromJson` |
| `components/admin/product-json-import-panel.tsx` | Wizard UI (client component) |
| `components/admin/product-json-import-preview-table.tsx` | Preview + warnings/errors display |
| `components/admin/product-json-import-summary.tsx` | Post-import report |
| `tests/product-json-import-v2-parse.test.ts` | Parser + version/errors |
| `tests/product-json-import-v2-validate-sync.test.ts` | Field validation, tier overlap, image rules |
| `tests/product-json-import-v2-match-images.test.ts` | Basename matching, primary sort |
| `tests/product-json-import-v2-map.test.ts` | Mapping to mutation input |
| `tests/product-json-import-import-action.test.ts` | Mocked Supabase happy/partial-fail paths |

### Променени файлове (минимален diff)

| Path | Промяна |
|------|---------|
| `app/admin/actions.ts` | `createProduct` делегира към `createProductDraftWithGallery`; extract `attachProductImages` / `deleteUploadedImagesBestEffort` / `validatePrimaryProductCategory` в shared lib **или** import actions import-ва от pipeline module |
| `app/admin/page.tsx` | Render `ProductJsonImportPanel` при `productsView=import`; link от products list header |
| `lib/admin/form-fields.ts` | Optional: `productImport.json`, `productImport.imageFiles`, `productImport.uploadedFilenames` |
| `lib/product-quantity-pricing.ts` | `validateQuantityPriceTierRanges(tiers)` — overlap detection (reuse от import + бъдещ admin editor) |
| `docs/admin-panel.md` | Кратка секция „JSON Import“ (след impl) |

### Не се пипат в MVP

- `supabase/*` migrations
- Promo/coupon WIP файлове
- Template repo
- `product_code` RPC override

---

## Admin UI flow

### Entry point

- URL: `/admin?tab=products&productsView=import` (parallel на `productsView=ordering`).
- Link в products tab header: **„Import от JSON“** ↔ **„Обратно към списъка“**.
- Alternative fallback: `<details>` accordion под `ProductCreatePanel` — **не** за MVP; отделен view е по-чист за multi-step wizard.

### Wizard steps (client state machine)

| Step | UI | Action |
|------|-----|--------|
| 1. JSON | File input `.json` + optional textarea paste | Client reads file → `parseProductJsonImportFile` |
| 2. Images | Multi-file input (reuse `ProductImageFileInput` UX) | Client keeps `File[]` in memory; показва count + basename list |
| 3. Validate | Button „Провери“ | `validateProductJsonImport({ json, uploadedFilenames })` |
| 4. Preview | Table: name, slug, categories, price, #images, status badge (ok/warn/error) | Expandable row: SEO, personalization fields, warnings |
| 5. Confirm | Button „Import като чернови“ (disabled ако blocking errors) | `importProductsFromJson(FormData)` |
| 6. Summary | Success/fail counts, links към edit | `?tab=products&editProduct={id}#product-{id}` |

### UX details

- **Blocking errors** — import button disabled; показват се file-level + per-product errors.
- **Warnings** — yellow badges; import позволен (напр. `product_code` ignored, unused files).
- **Pending state** — `AdminFormPendingGuard` pattern; progress „Import 2/5…“ при sequential create.
- **No publish** — няма status selector; copy: „Всички продукти се създават като чернови.“
- **Auth** — същият admin gate като `createProduct` (redirect login при липса на права).

### Wireframe (logical)

```
┌─ Import от JSON v2 ─────────────────────────────────────┐
│ [1] JSON файл: [ Choose file ]  darvena-liniyka.json    │
│ [2] Снимки:    [ Choose files ]  4 files selected       │
│     [ Провери ]                                          │
├─ Preview ────────────────────────────────────────────────┤
│ ✓ darvena-liniyka-s-ime-moliv  2.50 €  2 cat  4 img    │
│ ⚠ example-slug  warning: product_code ignored           │
│ ✗ bad-slug  error: slug already exists                  │
├─ [ Import като чернови (1 valid) ] ─────────────────────│
└─ Summary: 1 created, 1 failed, 1 warning ──────────────┘
```

---

## Server actions

### Да — отделен `importProductsFromJson`

Файл: `app/admin/product-import-actions.ts`

```typescript
// Pseudocode — not production code
export async function validateProductJsonImport(input: {
  json: string;
  uploadedFilenames: string[];
}): Promise<ProductJsonImportValidationResult>

export async function importProductsFromJson(
  formData: FormData,
): Promise<ProductJsonImportSummaryResult>
```

**Защо отделен action, не reuse на `createProduct` FormData:**

- Batch semantics + structured JSON result (не redirect).
- Category slugs → IDs resolution преди create.
- Image matching по `original_filename`, не по upload order.
- Summary object с per-product `stage: validate|create|gallery`.

**Защо не е в `actions.ts`:** batch import е self-contained; намалява merge conflict risk с promo WIP в `actions.ts`.

### `validateProductJsonImport`

1. Auth check (copy pattern от `blog-inline-image-actions.ts`).
2. `parseProductJsonImportFile(json)`.
3. `validateSync(parsed, uploadedFilenames)`.
4. DB pass:
   - `SELECT slug FROM products WHERE slug IN (...)`
   - `SELECT id, slug, category_type FROM categories WHERE slug IN (...)`
5. Merge → `{ errors[], warnings[], preview[] }`.

**No writes.** Image files **не** се качват на validate.

### `importProductsFromJson`

FormData:

| Field | Content |
|-------|---------|
| `json` | Raw JSON string |
| `image_files` | All bundle files (multi `append`) |

Flow per valid product (sequential MVP):

1. Re-run full validation (defense in depth).
2. Resolve category IDs.
3. Match + sort images → `File[]` + `altTexts[]`.
4. `validateProductImageUploadBatch(matchedFiles, 0)`.
5. `createProductDraftWithGallery({ mutationInput, postCreate, imageFiles, imageAltTexts })`.
6. Append to `created[]` or `failed[]`.
7. `revalidatePath("/admin")` once at end.
8. Return summary JSON.

---

## JSON validation

### Без Zod (project convention)

Ръчна validation като `parseProductPersonalizationFields` — typed guards + explicit error codes от spec §11.

### Module split

| Phase | Where | DB |
|-------|-------|-----|
| Parse | `parse.ts` | No |
| Sync validate | `validate-sync.ts` | No |
| Async validate | `validate-async.ts` | Yes |

### Key rules (from spec)

- File: `INVALID_JSON`, `UNSUPPORTED_VERSION`, `EMPTY_PRODUCTS`, max batch size.
- Per product blocking: duplicate slug in file, invalid slug (`validateProductSlug`), price, description, categories, primary_category, images, personalization, tiers, stocked + stock_quantity.
- Warnings: v1 aliases (`short_description`, `personalization_notes`), `product_code`, tiers without selector, unused uploads, target_filename pattern.

### v1 alias normalization (in map step)

| Alias | Maps to |
|-------|---------|
| `short_description` | `subtitle` if subtitle empty |
| `personalization_notes` | `personalization_info` if empty |

Emit warning when alias used.

### Defaults merge

`merged = { ...file.defaults, ...product }` for optional scalar fields; `status` always forced `"draft"` at write time.

---

## Image matching по `original_filename`

### Algorithm (`match-images.ts`)

```typescript
function normalizeImageBasename(name: string): string {
  // lowercase(trim(basename(name))) — strip path components
}

// Build index once per import:
// Map<normalizedBasename, File[]>
// (multiple uploads with same basename → error at validate)

// Per product:
for (const imageRow of sortedImages) {
  const key = normalizeImageBasename(imageRow.original_filename);
  if (!uploadIndex.has(key)) → blocking error IMAGE_FILE_MISSING
  matchedFiles.push(uploadIndex.get(key))
  altTexts.push(imageRow.alt.slice(0, 160))
}
```

### Sort order (gallery)

1. `primary: true` rows first (stable).
2. Then JSON array order.
3. If no `primary` → index 0 is hero (spec §10.3).

### Unused files

Collect all referenced basenames across all products; any upload not referenced → file-level warning `UNUSED_UPLOAD`.

### MVP limits

- **No zip extraction** — admin selects multiple files in file picker.
- **No `target_filename` rename** — storage uses existing pipeline names; field is warning-only.

---

## Създаване на draft продукти

### Mapping → `ProductMutationInput`

| Import | Mutation |
|--------|----------|
| Core text/price fields | Direct map |
| `categories` slugs | → UUID[] via resolved map |
| `primary_category` slug | → UUID |
| `personalization_fields` | → `ParsedPersonalizationField[]` (same shape as form parser) |
| `colorFields`, `optionGroups`, `wishTemplateIds` | Always `[]` in MVP |
| `imageUrl` | `null` (gallery sets hero) |
| `isCustomizable` | `defaults.is_customizable \|\| product.is_customizable \|\| fields.length > 0` |

### Post-create update (mirror `createProduct` lines 816–826)

Always:

```typescript
{
  status: "draft",
  visibility,
  show_quantity_selector,
  promo_code_eligible,  // default true — uses existing column; no promo WIP dependency
  quantity_price_tiers,
  personalization_open_by_default,
}
```

### `createProductDraftWithGallery` (new shared lib)

Extracted steps from `createProduct`:

1. `createProductAtomic`
2. Post-create update
3. Skip FAQ/wish/options (import MVP)
4. `processAndUploadProductImages`
5. `attachProductImages` + rollback storage on attach fail

Return type:

```typescript
type CreateProductDraftResult =
  | { ok: true; productId: string; imageCount: number }
  | { ok: false; stage: "create" | "status" | "upload" | "gallery"; productId?: string; message: string }
```

`createProduct` refactored to call this + FAQ sync + publish branch — **import path skips publish**.

---

## Attach на снимки

Reuse unchanged pipeline:

1. **`validateProductImageUploadBatch(files, 0)`** — before upload per product.
2. **`processAndUploadProductImages(supabase, productId, matchedFiles, 0)`** — optimize + storage upload.
3. **`attachProductImages(supabase, productId, uploaded, altTexts)`** — RPC `admin_attach_product_images`; first image → `products.image_url`.

Error handling (mirror manual create):

| Failure | Product state | Summary |
|---------|---------------|---------|
| Upload fail | Draft exists, no gallery | `failed`, stage `gallery`, edit link |
| Attach fail | Draft exists; storage rollback best-effort | Same message family as `createProduct` |

Matched files passed **in gallery order** so hero = first attach.

---

## Summary / error report

### Validation result (step 4)

```typescript
type ProductJsonImportValidationResult = {
  ok: boolean; // false if any blocking error
  importKey?: string;
  preview: Array<{
    slug: string;
    name: string;
    price: number;
    categorySlugs: string[];
    primaryCategory: string;
    imageCount: number;
    status: "ready" | "warning" | "error";
    errors: ImportIssue[];
    warnings: ImportIssue[];
  }>;
  fileErrors: ImportIssue[];
  fileWarnings: ImportIssue[];
};
```

### Import result (step 7)

Matches spec §13:

```typescript
type ProductJsonImportSummaryResult = {
  ok: boolean;
  importKey?: string;
  created: Array<{ slug: string; productId: string; editUrl: string; imageCount: number }>;
  failed: Array<{ slug: string; stage: "validate" | "create" | "gallery"; message: string; productId?: string }>;
  warnings: Array<{ slug?: string; code: string; message: string }>;
};
```

`editUrl`: `/admin?tab=products&editProduct={id}#product-{id}` (existing admin pattern).

UI: `ProductJsonImportSummary` — list with links; failed rows show stage + message; copy slug button.

---

## Tests

### Unit tests (no Supabase)

| File | Cases |
|------|-------|
| `product-json-import-v2-parse.test.ts` | Valid v2, invalid JSON, v1 rejected, empty products |
| `product-json-import-v2-validate-sync.test.ts` | Slug/price/description, duplicate slugs, personalization keys, tier overlap, primary_category ∉ categories, multiple primary images |
| `product-json-import-v2-match-images.test.ts` | Case-insensitive basename, path stripped, sort primary-first, missing file |
| `product-json-import-v2-map.test.ts` | v1 aliases, defaults merge, is_customizable forced, mutation payload shape |
| `product-quantity-pricing` (extend) | `validateQuantityPriceTierRanges` overlap |

### Integration-style tests (mocked client)

| File | Cases |
|------|-------|
| `product-json-import-import-action.test.ts` | Happy path 1 product; slug_taken skip; create ok + gallery fail → draft + failed entry; category missing → validate block |

### Fixtures

- `tests/fixtures/product-import-v2/darvena-liniyka.json` — trimmed from spec example
- `tests/fixtures/product-import-v2/invalid-*.json` — one file per error code

### Manual QA checklist (post-impl)

- [ ] Import example „Дървена линийка“ → draft + 4 gallery images + personalization field
- [ ] Re-import same slug → fail with slug_taken
- [ ] Missing image file → blocked at validate
- [ ] Unused extra file → warning only
- [ ] Product with invalid category slug → per-product error, others continue

---

## Извън MVP

| Item | Notes |
|------|-------|
| Zip upload + extract | Multi-file picker only |
| Strict all-or-nothing mode | Per-product continue in MVP |
| `product_code` override | Warning only; RPC keeps VM-XXXXXX |
| Update existing product by slug | Create-only v2 |
| Category creation | Slugs must exist |
| Option groups, colors, FAQ, upsells, landing pages | Manual admin after import |
| Remote image URLs | Files only |
| `target_filename` storage rename | SEO guidance only |
| Publish on import | Always draft |
| Parallel product creates | Sequential for simpler error handling |
| Import history / audit table | `import_key` in summary only |
| Client-side-only validate | Server validate required for slug/category DB |
| API route | Server actions sufficient |
| i18n EN | BG admin copy (consistent with panel) |

---

## MVP decisions (resolve spec open questions)

| Question | MVP decision |
|----------|--------------|
| Strict vs lenient | **Lenient** — skip failed products, import valid ones |
| Zip upload | **No** — multi-file input |
| Batch size | **Max 25 products**, max **2 MB** JSON |
| Max images | Existing product profile limits per `validateProductImageUploadBatch` |
| `product_code` | **Ignore** with warning |
| Branch/worktree | **`feat/product-json-import-v2`** from `origin/main` in clean worktree — **not** `D:\Cursor\src` dirty tree |

---

## Implementation phases

### Phase 1 — Lib + tests (no UI)

1. Types, parse, validate-sync, match-images, map-to-mutation.
2. `validateQuantityPriceTierRanges`.
3. Unit tests + fixtures.

### Phase 2 — Pipeline extract + actions

1. `product-create-pipeline.ts`; slim `createProduct` refactor.
2. `validate-async.ts`.
3. `product-import-actions.ts`.
4. Action tests with mocked Supabase.

### Phase 3 — Admin UI

1. `ProductJsonImportPanel` + preview + summary components.
2. `app/admin/page.tsx` wiring (`productsView=import`).
3. Manual QA with spec example.

### Phase 4 — Docs + PR

1. Update `docs/admin-panel.md`.
2. Append verification section to this report.
3. PR to main; **no deploy** unless explicitly requested.

---

## Рискове и mitigations

| Risk | Mitigation |
|------|------------|
| `createProduct` refactor breaks manual create | Extract pipeline; keep existing `createProduct` tests passing; run full test suite |
| Large image bundle timeout | Sequential per-product upload; batch limit 25; show progress |
| Promo WIP merge conflict in `actions.ts` | Work in clean worktree from main; minimal touch to `actions.ts` |
| `promo_code_eligible` column missing in prod DB | Field already in types/admin form; import uses same post-update as `createProduct` — if column missing, same error as manual create |

---

## Verification (planning step)

- [x] Spec read (`docs/product-json-import-v2.md`)
- [x] Current flows reviewed (`createProduct`, RPC, image upload, form fields, types)
- [x] Files to add/change listed
- [x] UI flow defined
- [x] `importProductsFromJson` + `validateProductJsonImport` specified
- [x] Validation, image match, draft create, gallery attach, summary documented
- [x] Tests listed
- [x] Out-of-MVP scope listed
- [x] Promo WIP excluded
- [x] Phase 1 lib + tests — **complete**
- [x] Phase 2 server actions + pipeline extract — **complete**
- [x] Phase 3 admin UI — **complete**

---

## Phase 1 — lib + tests

Дата: 2026-08-30  
Branch/worktree: `feat/product-json-import-v2-phase-1` @ `D:\Cursor\src-admin-products-perf` (from `origin/main` after PR #33 merge)  
Promo WIP: **не е пипан** (`D:\Cursor\src` остава dirty)

### PR #33

- Merged to `main` (`2ea8852`) — docs-only, **без deploy**.

### Добавени файлове

| Path | Роля |
|------|------|
| `lib/admin/product-json-import-v2/types.ts` | Contract types, issues, parse/validation/map results |
| `lib/admin/product-json-import-v2/constants.ts` | Limits, regex patterns |
| `lib/admin/product-json-import-v2/parse.ts` | JSON parse, version gate, batch limits |
| `lib/admin/product-json-import-v2/validate-sync.ts` | Sync validation + preview/normalized output |
| `lib/admin/product-json-import-v2/match-images.ts` | Basename match, sort, unused uploads |
| `lib/admin/product-json-import-v2/map-to-mutation.ts` | v1 alias normalize, map → mutation payload |
| `lib/product-quantity-pricing.ts` | `validateQuantityPriceTierRanges()` |
| `tests/fixtures/product-import-v2/darvena-liniyka.json` | v2 example fixture |
| `tests/fixtures/product-import-v2/invalid-version.json` | v1 rejection fixture |
| `tests/product-json-import-v2-*.test.ts` | 4 test files (parse, validate, match, map) |
| `tests/product-quantity-pricing-validation.test.ts` | Tier overlap/range tests |

### Какво покриват helper-ите

- **parse** — само `version: 2`; `INVALID_JSON`, `UNSUPPORTED_VERSION`, `EMPTY_PRODUCTS`, `TOO_MANY_PRODUCTS`
- **normalize/map** — `short_description` → `subtitle`, `personalization_notes` → `personalization_info` (warnings); `product_code` ignored (warning); `is_customizable` forced при personalization fields
- **validate-sync** — required fields, slug format, duplicate slugs in file, categories/primary_category slugs, price, description, images/alt, max one primary, personalization keys, stocked + stock_quantity, quantity tier overlap
- **match-images** — basename case-insensitive match, path strip, missing file blocking, unused upload warning, primary-first sort

### Tests result

```
npm run typecheck          → pass
npx tsx --test (4 import + quantity validation files) → 27/27 pass
```

### Какво остава за Phase 2

- `lib/admin/product-json-import-v2/validate-async.ts` — DB slug exists, category slug → ID resolve, primary category type
- `lib/admin/product-create-pipeline.ts` — extract from `createProduct`
- `app/admin/product-import-actions.ts` — `validateProductJsonImport`, `importProductsFromJson`
- Mocked action integration tests
- **Без UI, без deploy**

---

## Phase 2 — async validation + server actions

Дата: 2026-08-30  
Branch/worktree: `feat/product-json-import-v2-phase-2` @ `D:\Cursor\src-admin-products-perf` (from `origin/main` after PR #34 merge)  
Promo WIP: **не е пипан**

### PR #34

- Merged to `main` (`d538106`) — Phase 1 helpers, **без deploy**.

### Добавени / променени файлове

| Path | Роля |
|------|------|
| `lib/admin/product-json-import-v2/validate-async.ts` | DB slug/category validation, importable product resolution |
| `lib/admin/product-json-import-v2/import-service.ts` | Testable validate/import orchestration |
| `lib/admin/product-create-pipeline.ts` | Shared draft create + gallery attach + rollback |
| `app/admin/product-import-actions.ts` | `validateProductJsonImport`, `importProductsFromJson` |
| `app/admin/actions.ts` | `createProduct` delegates to pipeline (minimal refactor) |
| `lib/admin/product-json-import-v2/match-images.ts` | `buildUploadFileIndex`, `resolveProductImportImageFiles` |
| `lib/admin/product-json-import-v2/types.ts` | Validation/summary result types |
| `tests/helpers/mock-product-import-supabase.ts` | Mock Supabase for import tests |
| `tests/product-json-import-v2-validate-async.test.ts` | Async DB validation tests |
| `tests/product-json-import-v2-import-action.test.ts` | Import service tests |
| `tests/product-create-pipeline.test.ts` | Pipeline unit tests |

### Какво работи

- **validateProductJsonImport** — parse → sync → async DB checks; **no writes**; returns previews + `importableProducts`
- **importProductsFromJson** — re-validates, matches `image_files` by basename, creates drafts sequentially, returns `{ created, failed, warnings }`
- **Async checks** — `SLUG_TAKEN`, `CATEGORY_NOT_FOUND`, `INVALID_PRIMARY_CATEGORY` (occasion primary blocked)
- **Pipeline** — `createProductDraftWithGallery` reused by manual `createProduct` and import path
- **Per-product continue** — gallery/create fail on one product does not stop others

### Tests result

```
npm run typecheck → pass
Phase 1 + Phase 2 tests → 42/42 pass
```

### Какво остава за Phase 3 UI

- `components/admin/product-json-import-panel.tsx` + preview/summary components
- `/admin?tab=products&productsView=import` entry point
- Wire client wizard to `validateProductJsonImport` + `importProductsFromJson`
- Manual QA with darvena-liniyka fixture + real uploads
- **Без deploy** unless explicitly requested

---

## Phase 3 — Admin UI wizard

Дата: 2026-08-30  
Branch/worktree: `feat/product-json-import-v2-phase-3-ui` @ `D:\Cursor\src-admin-products-perf` (from `origin/main` after PR #35 merge)  
Promo WIP: **не е пипан**

### PR #35

- Merged to `main` (`8587af7`) — Phase 2 actions/pipeline, **без deploy**.

### Добавени / променени файлове

| Path | Роля |
|------|------|
| `components/admin/product-json-import-panel.tsx` | Wizard: JSON + images → validate → import → summary |
| `components/admin/product-json-import-preview-table.tsx` | Preview table + status badges |
| `components/admin/product-json-import-summary.tsx` | Created/failed/warnings + edit links |
| `app/admin/page.tsx` | `productsView=import` branch (lightweight, no list/create panels) |
| `components/admin/product-list-slim-panel.tsx` | Link „Импорт от JSON“ |
| `tests/product-json-import-ui-contract.test.ts` | Page/panel/action contract checks |

### UI flow

1. `/admin?tab=products&productsView=import`
2. JSON file или textarea paste
3. Multi-file image picker (client state до confirm)
4. **Провери** → `validateProductJsonImport`
5. Preview table (име, slug, цена, категории, снимки, статус)
6. **Импорт като чернови** (disabled при blocking errors) → `importProductsFromJson`
7. Summary in-page (без redirect) с edit links към `/admin?tab=products&editProduct=...`

### Tests result

```
npm run typecheck → pass
Phase 1 + Phase 2 + UI contract tests → pass
```

### Manual QA checklist (pre-deploy)

- [ ] Open import view from products list link
- [ ] Upload darvena-liniyka v2 JSON + 4 images → validate shows warnings only
- [ ] Import creates draft with gallery
- [ ] Edit link opens product in admin
- [ ] Re-import same slug → blocking error in preview
- [ ] Missing image file → import blocked for product
- [ ] Back link returns to standard products view

### Преди preview/deploy

- Merge Phase 3 PR to main
- Manual QA on preview environment with real admin auth + Supabase
- Optional: docs/admin-panel.md section
- **Deploy only when explicitly requested**

---

## Phase 3 Preview QA ready

Дата: 2026-08-30  
Merge commit: `a362094` (PR #36 → `main`)  
Preview deployment: `dpl_F2mkec58PP1BZsZgMRVwdzo7RMz3`  
Preview URL: https://vemidi-store-qi55elan4-ve-mi-di.vercel.app  
Production: **не е промотиран** · custom domain alias: **не е пипан**  
Promo WIP: **не е пипан**

### Unauth smoke (preview)

| Route | Result | Time |
|-------|--------|------|
| `/admin?tab=products&productsView=import` | `307` → `/admin/login` | ~1.5s |
| `/admin?tab=products` | `307` → `/admin/login` | ~1.0s |
| `/admin?tab=categories` | `307` → `/admin/login` | ~0.6s |

Няма `504` / timeout на smoke paths.

### Manual QA checklist (за теб)

1. Login в preview admin: https://vemidi-store-qi55elan4-ve-mi-di.vercel.app/admin/login
2. Отвори https://vemidi-store-qi55elan4-ve-mi-di.vercel.app/admin?tab=products&productsView=import
3. Качи `tests/fixtures/product-import-v2/darvena-liniyka.json` (или реалния v2 JSON)
4. Качи снимките с **същите** `original_filename` от JSON-а
5. Натисни **Провери** — очакван preview с warnings (product_code ignored), без blocking errors
6. Прегледай preview table (slug, категории, primary, брой снимки)
7. Натисни **Импорт като чернови**
8. От summary отвори **Редакция** на създадения draft
9. Провери: текстове, SEO, категории, primary category, personalization field, галерия (hero + ред)

### След manual QA

- [ ] QA pass → production promote (отделна задача, изрично одобрение)
- [ ] QA fail → fix + нов preview deploy
- [ ] Optional: `docs/admin-panel.md` import section

---

## Preview import submit bugfix

Дата: 2026-08-30  
Branch: `fix/product-json-import-submit` @ `D:\Cursor\src-admin-products-perf`  
Promo WIP: **не е пипан** · Production: **не е deploy-нат**

### Симптом

- Validation: „1 готови за import · 0 с грешки“
- **Импорт като чернови** → UI: `An unexpected response was received from the server.`
- Preview: `dpl_F2mkec58PP1BZsZgMRVwdzo7RMz3`

### Диагноза

1. **Validate** (`validateProductJsonImport`) изпраща само JSON + filename list — работи стабилно като server action.
2. **Import submit** качва `FormData` + `File[]` през директен server action call от client component — на Vercel preview това често връща non-RSC отговор (timeout при image processing/sharp, или multipart action boundary), което Next.js показва като generic English error.
3. `runImportProductsFromJson` / `createProductDraftWithGallery` вече връщат structured `{ ok: false, failed: [...] }` при DB/RPC/upload/gallery грешки — **не** хвърлят — но uncaught runtime throw или non-JSON HTTP отговор bypass-ваха UI error handling.
4. `promo_code_eligible` post-create update: при липсваща колона връща structured status-stage failure (не throw); не е root cause на generic error, но се вижда в summary след fix-а.
5. Vercel runtime logs за deployment-а не показаха historical stack trace (streaming only); симптомът съвпада с action multipart/timeout pattern.

### Fix

| Промяна | Файл |
|---------|------|
| Shared submit helper + runtime catch | `lib/admin/product-json-import-v2/import-submit.ts` |
| Dedicated multipart route `POST /admin/product-import` (`maxDuration=60`, `runtime=nodejs`) | `app/admin/product-import/route.ts` |
| Action delegate + catch (backward compat) | `app/admin/product-import-actions.ts` |
| UI submit → `fetch("/admin/product-import")` + BG error messages | `components/admin/product-json-import-panel.tsx` |
| Regression tests (throw → structured failure, route contract) | `tests/product-json-import-submit-error.test.ts` |

**Поведение след fix:**

- Server action / route **никога** не остават uncaught throw към client.
- Runtime грешки → `{ ok: false, created: [], failed: [{ stage: "create", message: "..." }], warnings: [] }`.
- Auth грешки → `{ ok: false, message: "...", created: [], failed: [], warnings: [] }`.
- UI показва български съобщения; при 504/non-JSON → „надхвърли времевия лимит“ / „неочакван отговор“.

### Tests

```
npm run typecheck → pass
product-json-import-v2 + submit-error + UI contract → 49/49 pass
```

### Нов preview deploy

Commit: `60f1cd1`  
Deployment: `dpl_5HWvFubWzigqy6PQmh46xC1SCgaH`  
Preview URL: https://vemidi-store-9wzardxdc-ve-mi-di.vercel.app  
Inspect: https://vercel.com/ve-mi-di/vemidi-store/5HWvFubWzigqy6PQmh46xC1SCgaH  
Production: **не е промотиран**

---

## Preview import payload hardening

Дата: 2026-08-30  
Branch: `codex/product-json-import-client-compress` @ `D:\Cursor\src\.worktrees\import-submit-fix`  
Base: `origin/fix/product-json-import-submit`  
Promo WIP: **не е пипан** · Production: **не е deploy-нат**

### Симптом

След route-handler fix-а preview все още можеше да покаже:

`Импортът не успя — сървърът върна неочакван отговор. Опитайте отново или намалете размера на снимките.`

Това означава, че заявката се чупи преди приложението да върне JSON summary — най-често от multipart payload лимит или timeout при твърде големи снимки.

### Fix

| Промяна | Файл |
|---------|------|
| Client-side image preparation/compression преди multipart submit | `lib/admin/product-json-import-v2/client-image-compress.ts` |
| Import panel submit използва подготвените файлове, запазва оригиналните filenames за `original_filename` matching | `components/admin/product-json-import-panel.tsx` |
| По-точно BG съобщение при HTTP `413 Payload Too Large` | `components/admin/product-json-import-panel.tsx` |
| Regression tests за compression contract и UI wiring | `tests/product-json-import-client-image-compress.test.ts` |

### Поведение

- Големи снимки се resize-ват в браузъра до max edge `1800px` и WebP target около `900 KB`.
- Ако целият bundle е голям, оптимизират се и средните снимки, за да не се удари Vercel multipart limit.
- Имената на файловете се запазват, така че JSON `original_filename` match-ът остава валиден.
- Малки снимки не се променят.

### Tests

```
npm run typecheck → pass
npx tsx --test tests/product-json-import-*.test.ts tests/product-create-pipeline.test.ts → 55/55 pass
```

---

## Свързани документи

- Spec: `docs/product-json-import-v2.md`
- Spec task report: `docs/task-reports/2026-08-30-product-json-import-v2-spec.md`
- Reference product JSON (v1): `D:\velly\site\darvena-liniyka-s-ime-moliv.json`
