# Product JSON Import — v2 Specification

Дата: 2026-08-30  
Проект: VeMiDi Store (`vemidi-dev/vemidi-store`)  
Статус: **Planning / contract only** — без UI, без schema changes, без имплементация в тази стъпка.

---

## 1. Цел

Да се дефинира **стандартизиран JSON contract v2** и import flow за **batch създаване на продукти като чернови** в admin панела, с качване на снимки по `original_filename` и mapping към съществуващите DB полета / server actions (`createProduct` → `createProductAtomic` → gallery attach).

Целеви use case: подготовка на продуктови данни offline (напр. с ChatGPT), качване на JSON + image bundle, preview, и атомично създаване на draft продукти без ръчно попълване на формуляра.

---

## 2. Какво import-ът **НЕ** прави (v2 scope)

| Изключено | Бележка |
|-----------|---------|
| Публикуване | Винаги `status: "draft"`. Publish остава ръчен admin step. |
| Update на съществуващ продукт | v2 е **create-only** (по slug uniqueness). |
| Създаване на категории | Slug-овете трябва да съществуват в `categories`. |
| Option groups / variant values | Не се импортират (`product_option_groups`, `product_option_values`). |
| Color fields | Не се импортират. |
| Wish templates / FAQ / upsell / landing pages | Не се импортират. |
| Promotions / coupons | Не се създават. |
| Remote image URLs | Снимките се качват като files; import не тегли от URL. |
| Автоматично преименуване на локални файлове | `target_filename` е SEO препоръка, не задължително rename преди upload. |
| Schema / RPC migrations | Тази спецификация не променя Supabase. |
| `product_code` override | Текущият `admin_create_product_v11` генерира `VM-XXXXXX`. Полето в JSON е **metadata / future** — виж §6. |

---

## 3. JSON contract v2 — top level

```jsonc
{
  "version": 2,                    // required, literal 2
  "import_key": "optional-batch-id", // optional, за audit log / summary grouping
  "defaults": { /* ImportDefaults */ }, // optional
  "products": [ /* ProductImportV2[] */ ]  // required, min 1
}
```

### 3.1 `ImportDefaults` (optional)

Стойности по подразбиране за всеки продукт, ако липсват на ниво product.

| Поле | Тип | Default ако липсва |
|------|-----|-------------------|
| `status` | `"draft"` | `"draft"` (import винаги записва draft) |
| `visibility` | `"public" \| "hidden"` | `"public"` |
| `fulfillment_type` | `"made_to_order" \| "stocked"` | `"made_to_order"` |
| `is_customizable` | boolean | `false` |
| `promo_code_eligible` | boolean | `true` |
| `show_quantity_selector` | boolean | `false` |
| `personalization_open_by_default` | boolean \| null | `null` |

---

## 4. `ProductImportV2` — schema

### 4.1 Задължителни полета

| JSON поле | Тип | Validation |
|-----------|-----|------------|
| `name` | string | non-empty, trim, max 200 |
| `slug` | string | `validateProductSlug()` — lowercase `[a-z0-9-]`, max 80, не UUID |
| `price` | number | `>= 0`, max 2 decimal places |
| `description` | string | non-empty (RPC `product_text_required`) |
| `categories` | string[] | min 1 slug; всеки slug съществува в DB |
| `primary_category` | string | slug; ∈ `categories`; `category_type` ∈ `product`, `material` |
| `images` | ImageImportV2[] | min 1; всеки `alt` non-empty; всеки `original_filename` unique в продукта |

### 4.2 Optional полета — core

| JSON поле | DB / admin mapping | Validation / default |
|-----------|-------------------|----------------------|
| `product_code` | *(не се записва в v2 impl)* | Optional string, `[A-Z0-9-]{2,32}` — advisory; RPC генерира `VM-XXXXXX`. За бъдещо разширение или warning в preview. |
| `subtitle` | `products.subtitle` | max 200 |
| `heading_subtitle` | `products.heading_subtitle` | max 200 |
| `short_description` | → `subtitle` ако `subtitle` липсва | Deprecated alias в v2; prefer `subtitle` |
| `additional_info` | `products.additional_info` | text |
| `personalization_info` | `products.personalization_info` | text; UI „инфо за персонализация“ |
| `personalization_notes` | → `personalization_info` ако липсва | v1 alias |
| `dimensions_materials` | `products.dimensions_materials` | text |
| `ordering_info` | `products.ordering_info` | text |
| `fulfillment_note` | `products.fulfillment_note` | text |
| `card_badge` | `products.card_badge` | normalized badge text |
| `is_sold_out` | `products.is_sold_out` | default `false` |
| `is_customizable` | `products.is_customizable` | default from defaults; **forced `true`** ако има `personalization_fields.length > 0` (както `createProduct`) |
| `show_quantity_selector` | `products.show_quantity_selector` | default `false` |
| `promo_code_eligible` | `products.promo_code_eligible` | default `true` (виж §8) |
| `fulfillment_type` | `products.fulfillment_type` | `made_to_order` \| `stocked` |
| `stock_quantity` | `products.stock_quantity` | required ако `fulfillment_type === "stocked"`, integer ≥ 0 |
| `visibility` | `products.visibility` | `public` \| `hidden` |
| `personalization_open_by_default` | `products.personalization_open_by_default` | `true` \| `false` \| omit → null |

### 4.3 Optional — SEO

| JSON поле | DB mapping | Max length |
|-----------|------------|------------|
| `meta_title` | `products.meta_title` | 120 |
| `meta_description` | `products.meta_description` | 160 |
| `og_title` | `products.og_title` | 120 |
| `og_description` | `products.og_description` | 160 |

### 4.4 Optional — `personalization_fields[]`

| JSON поле | DB (`product_personalization_fields`) | Rules |
|-----------|--------------------------------------|-------|
| `label` | `label` | required per row |
| `field_key` | `field_key` | `/^[a-z][a-z0-9_]{0,63}$/`, unique per product |
| `field_type` | `field_type` | `text` \| `textarea` \| `date` |
| `placeholder` | `placeholder` | optional |
| `max_length` | `max_length` | int 1–1000; за `date` → 10 |
| `price_delta` | `price_delta` | number ≥ 0 |
| `required` | `is_required` | boolean |
| `allows_wish_templates` | `allows_wish_templates` | само за `textarea` |
| `sort_order` | `sort_order` | optional; default array index |

Max 20 полета (както `parseProductPersonalizationFields`).

### 4.5 Optional — `quantity_price_tiers[]`

| JSON поле | Internal type | Rules |
|-----------|---------------|-------|
| `minQuantity` | `ProductQuantityPriceTier.minQuantity` | int ≥ 1 |
| `maxQuantity` | `maxQuantity` | int ≥ minQuantity или `null` (open-ended) |
| `unitPrice` | `unitPrice` | number ≥ 0 |

Нормализация: `normalizeQuantityPriceTiers()`. Tier ranges не трябва да се припокриват (validation warning/error).

### 4.6 `ImageImportV2`

| JSON поле | Required | Rules |
|-----------|----------|-------|
| `original_filename` | yes | Basename match към uploaded file (case-insensitive). Unique per product. |
| `alt` | yes | non-empty, max 160 chars |
| `target_filename` | no | SEO препоръка за storage name; import **не** изисква file да е преименуван |
| `primary` | no | boolean; max 1 `true` per product. Ако липсва → първата снимка е primary |

---

## 5. Mapping JSON → admin / DB (референция)

### 5.1 Product core (`createProductAtomic` / `admin_create_product_v11`)

| JSON | RPC / `products` column |
|------|-------------------------|
| `name` | `p_name` / `name` |
| `slug` | `p_slug` / `slug` |
| `subtitle` | `p_subtitle` / `subtitle` |
| `heading_subtitle` | `p_heading_subtitle` / `heading_subtitle` |
| `description` | `p_description` / `description` |
| `additional_info` | `p_additional_info` / `additional_info` |
| `personalization_info` | `p_personalization_info` / `personalization_info` |
| `dimensions_materials` | `p_dimensions_materials` / `dimensions_materials` |
| `ordering_info` | `p_ordering_info` / `ordering_info` |
| `fulfillment_note` | `p_fulfillment_note` / `fulfillment_note` |
| `price` | `p_price` / `price` |
| `is_customizable` | `p_is_customizable` / `is_customizable` |
| `is_sold_out` | `p_is_sold_out` / `is_sold_out` |
| `fulfillment_type` | `p_fulfillment_type` / `fulfillment_type` |
| `stock_quantity` | `p_stock_quantity` / `stock_quantity` |
| `card_badge` | `p_card_badge` / `card_badge` |
| `meta_*`, `og_*` | `p_meta_*`, `p_og_*` / same columns |
| `category slugs` → IDs | `p_category_ids` |
| `primary_category` slug → ID | `p_primary_category_id` |
| `personalization_fields` | `p_personalization_fields` JSON array |

### 5.2 Post-RPC update (както `createProduct` след atomic create)

| JSON | `products` update |
|------|-------------------|
| `status` | винаги `"draft"` |
| `visibility` | `visibility` |
| `show_quantity_selector` | `show_quantity_selector` |
| `promo_code_eligible` | `promo_code_eligible` |
| `quantity_price_tiers` | `quantity_price_tiers` (jsonb) |
| `personalization_open_by_default` | `personalization_open_by_default` |

### 5.3 Gallery (`processAndUploadProductImages` + `admin_attach_product_images`)

| Step | Behavior |
|------|----------|
| Match file | Upload bundle file where `basename(file.name)` equals `original_filename` (case-insensitive) |
| Process | `validateProductImageUploadBatch` → `processAndUploadProductImages` |
| Attach | `admin_attach_product_images` with `{ image_url, alt_text }[]` in gallery order |
| Primary | Първата снимка в sorted order (primary first) → `products.image_url` via RPC attach |

---

## 6. Правила за categories и `primary_category`

1. **`categories`** е масив от **slug-ове** (не UUID), рефериращи съществуващи редове в `categories`.
2. Резолюция: `SELECT id, slug, category_type FROM categories WHERE slug IN (...)`.
3. Липсващ slug → **blocking error** за продукта.
4. **`primary_category`** (required):
   - Трябва да е елемент от `categories`.
   - `category_type` трябва да е `product` или `material` (както `validatePrimaryProductCategory` / `allowsPrimaryProductCategory`).
   - Occasion-only категории могат да са в `categories`, но **не** могат да са primary.
5. Ако `categories` съдържа и `product`/`material` и `occasion` slug-ове — всички се записват в `product_categories`; primary остава product/material.
6. Препоръка за v2 JSON: `[ "parent-slug", "child-slug" ]` + `primary_category: "child-slug"`.

---

## 7. Правила за `promo_code_eligible`

Полето **съществува** в codebase (`products.promo_code_eligible`, admin checkbox `promo_code_eligible`, default **true** per `parseProductCreateDraft`).

| Правило | Detail |
|---------|--------|
| JSON тип | boolean, optional |
| Default | `true` (продуктът участва в промокод отстъпки) |
| Import behavior | Записва се в post-create update, заедно с draft status |
| `false` meaning | Checkout/coupon SQL пропуска продукта при процентна отстъпка (виж локален WIP `promo_code_eligible` — **не е част от import impl в тази фаза**, но contract-ът го поддържа) |
| Validation | само boolean; no cross-field rules в v2 |

---

## 8. Правила за `personalization_fields`

1. Optional масив. Празен/липсващ → няма редове в `product_personalization_fields`.
2. Ако `personalization_info` / `personalization_notes` е попълнено, но няма fields → само текстово info на product page; **не** се създава checkout field автоматично (unless future `auto_personalization_field` flag — **out of scope**).
3. Ако има ≥1 field → `is_customizable = true` (mirror `createProduct`).
4. Keys: lowercase snake_case, unique.
5. `allows_wish_templates: true` само при `field_type: "textarea"`.
6. Import **не** auto-генерира field от `personalization_notes`; generator prompt-ът трябва да изведе и двата блока при нужда.

**Пример за „Дървена линийка“:**

```json
"personalization_info": "Задължителна персонализация с име. Въведете името на детето при поръчка.",
"personalization_fields": [
  {
    "label": "Име на детето",
    "field_key": "child_name",
    "field_type": "text",
    "placeholder": "Напр. Емма",
    "max_length": 50,
    "price_delta": 0,
    "required": true
  }
]
```

---

## 9. Правила за `quantity_price_tiers`

1. Optional; празен масив → `null` / `[]` в DB.
2. Изисква `show_quantity_selector: true` за смислен storefront UX (warning в preview ако tiers без selector).
3. Формат след `normalizeQuantityPriceTiers`.
4. `unitPrice` е **единична** цена за tier range, не обща сума.
5. Overlapping ranges → validation error.

---

## 10. Правила за images

### 10.1 Matching

```
normalize(name) = lowercase(trim(basename(name)))
```

Uploaded file matches JSON row when `normalize(uploaded.name) === normalize(original_filename)`.

- Path components в `original_filename` се игнорират — само basename.
- Duplicate `original_filename` в един продукт → error.
- File referenced but not uploaded → blocking error at validate.
- Uploaded file not referenced → warning (ignored) or optional strict mode error.

### 10.2 `target_filename`

- SEO препоръка: `{slug}-vemidi-crafts-{nn}.webp` pattern.
- Import **може** да подаде desired basename на storage layer в бъдеща impl; v2 contract го носи за generator guidance.
- Не блокира import ако local file still named `ChatGPT Image ....png`.

### 10.3 Primary / order

1. Sort key: `primary: true` first (stable), then JSON array order.
2. Exactly one primary: if multiple `primary: true` → error; if none → index 0.
3. Gallery order = sort order; RPC attach sets first image as product hero.

### 10.4 Alt text

- Required, non-empty, max 160 (align `getProductImageAltTexts` slice).
- Blocking validation before create.

---

## 11. Validation (единен validate pass)

### 11.1 File-level

| Code | Severity | Rule |
|------|----------|------|
| `INVALID_JSON` | block | JSON parse fail |
| `UNSUPPORTED_VERSION` | block | `version !== 2` |
| `EMPTY_PRODUCTS` | block | `products.length === 0` |

### 11.2 Per-product blocking

- Duplicate `slug` in file
- `slug` already exists in DB
- Invalid slug / price / description
- Category slug not found
- `primary_category` invalid
- Image alt empty / file missing
- Personalization field invalid
- Quantity tier invalid / overlap
- `stock_quantity` invalid when stocked

### 11.3 Warnings (non-blocking)

- `product_code` provided but will be ignored (auto VM code)
- `short_description` / `personalization_notes` v1 aliases used
- `quantity_price_tiers` without `show_quantity_selector`
- Unused uploaded files
- `target_filename` doesn't match slug pattern

---

## 12. Import flow (implementation target)

```
┌─────────────┐    ┌──────────────┐    ┌────────────┐    ┌─────────┐
│ 1. Upload   │───▶│ 2. Upload    │───▶│ 3. Validate│───▶│ 4. Preview│
│    JSON     │    │    images    │    │    (full)  │    │    table  │
└─────────────┘    └──────────────┘    └────────────┘    └────┬────┘
                                                                │
┌─────────────┐    ┌──────────────┐    ┌────────────┐          │
│ 7. Summary  │◀───│ 6. Attach    │◀───│ 5. Create  │◀─────────┘
│    report   │    │    gallery   │    │    drafts  │   [Confirm import]
└─────────────┘    └──────────────┘    └────────────┘
```

### Step details

1. **Upload JSON** — admin tab `products` → import panel; accept `.json`, max size TBD (e.g. 2 MB).
2. **Upload images** — multi-file or `.zip`; extract to temp; build filename index.
3. **Validate** — parse v2, resolve categories, check slugs, match images; produce `{ errors[], warnings[], preview[] }`.
4. **Preview** — tabular: name, slug, categories, price, image count, warnings; expandable SEO/personalization.
5. **Create drafts** — for each valid product sequentially or small batch:
   - `createProductAtomic(...)` (same payload as manual create)
   - post-update: draft status, visibility, promo_code_eligible, tiers, etc.
6. **Attach gallery** — per product, matched files → `processAndUploadProductImages` → `attachProductImages`; on partial failure: product remains draft, error in summary (mirror `createProduct` gallery error handling).
7. **Summary** — counts: created / failed / warnings; links to `editProduct` for each success.

**Idempotency:** re-run on same slug → fail with `slug_taken` (no upsert in v2).

---

## 13. Error handling

| Scenario | Behavior |
|----------|----------|
| JSON invalid | Stop before preview; no DB writes |
| Product validation fail | Skip product; continue others (configurable strict mode: all-or-nothing) |
| `createProductAtomic` fail | Record error message from `getProductMutationErrorMessage`; no gallery attempt |
| Post-create status update fail | Product exists as draft; report partial success + edit link |
| Image upload fail | Draft product exists; message mirrors manual create re-select gallery |
| Gallery attach fail | Rollback uploaded storage best-effort; draft without gallery |
| Auth fail | Standard admin redirect |

Summary object:

```jsonc
{
  "import_key": "...",
  "created": [{ "slug": "...", "product_id": "...", "edit_url": "..." }],
  "failed": [{ "slug": "...", "stage": "validate|create|gallery", "message": "..." }],
  "warnings": [{ "slug": "...", "code": "...", "message": "..." }]
}
```

---

## 14. v1 → v2 migration notes

Reference file: `D:\velly\site\darvena-liniyka-s-ime-moliv.json` (version 1).

| v1 | v2 |
|----|-----|
| `version: 1` | `version: 2` |
| `short_description` | `subtitle` |
| `personalization_notes` | `personalization_info` + optional `personalization_fields` |
| `categories[]` only | + required `primary_category` |
| images without `primary` | same + optional `primary` |
| no `promo_code_eligible` | optional, default true |
| no tiers / personalization_fields | optional arrays |

---

## 15. Example v2 JSON — „Дървена линийка с име – Молив“

```json
{
  "version": 2,
  "import_key": "darvena-liniyka-s-ime-moliv-2026-08-30",
  "defaults": {
    "status": "draft",
    "visibility": "public",
    "fulfillment_type": "made_to_order",
    "is_customizable": true,
    "promo_code_eligible": true
  },
  "products": [
    {
      "name": "Дървена линийка с име – Молив",
      "slug": "darvena-liniyka-s-ime-moliv",
      "product_code": "LIN-MOL-01",
      "price": 2.5,
      "subtitle": "Дървена линийка с форма на молив, гравирано име и скала до 15 см.",
      "description": "Дървената линийка с име е практичен и личен аксесоар за училище или детската градина. Формата на молив и гравираните детайли я превръщат в интересна част от ученическите принадлежности.\n\nВърху линийката са изобразени отворена книга, букви и посланието „Светът принадлежи на тези, които четат!“. Скалата е разграфена от 0 до 15 см.\n\nИмето на детето се гравира върху продукта и е задължително при поръчка.",
      "categories": [
        "za-uchilishte-i-detska-gradina",
        "liniyki"
      ],
      "primary_category": "liniyki",
      "personalization_info": "Задължителна персонализация с име. Въведете името на детето при поръчка.",
      "personalization_fields": [
        {
          "label": "Име на детето",
          "field_key": "child_name",
          "field_type": "text",
          "placeholder": "Напр. Емма",
          "max_length": 50,
          "price_delta": 0,
          "required": true
        }
      ],
      "promo_code_eligible": true,
      "meta_title": "Дървена линийка с име – Молив | VeMiDi Crafts",
      "meta_description": "Дървена линийка с форма на молив, скала до 15 см и гравирано име. Практичен персонализиран аксесоар за ученик.",
      "og_title": "Дървена линийка с име – Молив",
      "og_description": "Персонализирана дървена линийка с форма на молив, скала до 15 см и име на детето.",
      "images": [
        {
          "original_filename": "ChatGPT Image Aug 29, 2026, 04_41_32 PM.png",
          "target_filename": "darvena-liniyka-s-ime-moliv-vemidi-crafts-01.webp",
          "alt": "Дървени линийки с форма на молив и гравирани детски имена",
          "primary": true
        },
        {
          "original_filename": "ChatGPT Image Aug 29, 2026, 04_30_14 PM.png",
          "target_filename": "darvena-liniyka-s-ime-moliv-vemidi-crafts-02.webp",
          "alt": "Дървена линийка молив с гравирано име Емма"
        },
        {
          "original_filename": "1Asset 6.png",
          "target_filename": "darvena-liniyka-s-ime-moliv-vemidi-crafts-03.webp",
          "alt": "Персонализирана дървена линийка молив с име Александър"
        },
        {
          "original_filename": "ChatGPT Image Aug 29, 2026, 04_17_00 PM.png",
          "target_filename": "darvena-liniyka-s-ime-moliv-vemidi-crafts-04.webp",
          "alt": "Дървена линийка с форма на молив и име Симеон"
        }
      ]
    }
  ]
}
```

---

## 16. Example ChatGPT prompt (generator)

```
Генерирай Product JSON Import v2 за VeMiDi Crafts store admin.

Изход: само валиден JSON (без markdown), version=2.

Продукт: {опиши продукта на български}

Задължителни правила:
- slug: lowercase latin, kebab-case, от името
- price: число в EUR
- description: 2–4 абзаца на български
- categories: масив от slug-ове на съществуващи категории: {списък}
- primary_category: един slug от categories, product/material тип
- personalization_info + personalization_fields ако продуктът изисква име/текст при поръчка
- promo_code_eligible: true освен ако продуктът не трябва да участва в промокод
- meta_title ≤120, meta_description ≤160, og_title ≤120, og_description ≤160
- images[]: поне 1; original_filename = точното име на файла който ще кача; alt задължителен на български; target_filename по шаблон {slug}-vemidi-crafts-{nn}.webp; първата primary:true

Не включвай: option groups, colors, FAQ, upsells, landing pages.
status винаги draft.
```

---

## 17. Implementation references (current codebase)

| Concern | File |
|---------|------|
| Admin create form | `components/admin/product-create-panel.tsx` |
| Create action | `app/admin/actions.ts` → `createProduct` |
| Atomic RPC | `lib/admin/product-rpc.ts` → `createProductAtomic` / `admin_create_product_v11` |
| Form field names | `lib/admin/form-fields.ts` |
| Types | `lib/admin/types.ts` |
| Image pipeline | `lib/admin/product-image-upload.ts` |
| Quantity tiers | `lib/product-quantity-pricing.ts` |
| Slug validation | `lib/product-slug.ts` |

---

## 18. Open questions (post-spec)

1. **`product_code` import** — extend RPC or post-create UPDATE?
2. **Strict vs lenient** — fail all on any error vs per-product continue?
3. **Zip upload** — max files / total size limits?
4. **Batch size** — max products per import?

Тези решения се вземат при UI/impl фаза; не блокират v2 contract.
