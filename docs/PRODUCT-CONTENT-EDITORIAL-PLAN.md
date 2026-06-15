# Product content editorial plan (read-only)

Prepared from `docs/CONTENT-AND-STRUCTURED-DATA-AUDIT.md` production sample (7 live SKUs).
**Do not apply in production without review.** Code fallbacks now improve meta/OG/JSON-LD hygiene, but body copy and cluster differentiation remain editorial work.

---

## Shared cluster issue (H-03)

Five money-envelope variants share the same opening paragraph in `products.description`. Titles differ; body and meta intent overlap. Differentiate by **occasion**, **recipient**, **personalization options**, and **format** — only where supported by real product configuration.

---

## 1. `/products/plik-za-pari`

| Field | Current state |
|---|---|
| **Audit IDs** | H-02, H-03, M-01 |
| **Meta** | ~160 chars but contains literal `\r\n` in source |
| **Body** | Long shared cluster copy; `\r\n` in DB text |
| **Category** | Пликове за пари (assumed from cluster) |
| **Missing data** | Occasion-specific intro; material/dimensions as scannable facts |

**Recommended structure (body, not meta paste):**

1. **Intro (1–2 sentences):** Base wedding/gift use case — only if true for this SKU.
2. **Персонализация:** Color + text options (if enabled in admin).
3. **Изработка:** Use real `fulfillmentNote` or admin default.
4. **Повод:** Generic „подарък за специален повод“ unless this SKU is occasion-neutral.

**Do not invent:** GTIN, dimensions, materials not in admin.

---

## 2. `/products/plik-za-pari-copy-2`

| Field | Current state |
|---|---|
| **Audit IDs** | H-02, H-03, L-01 |
| **Meta** | Duplicate cluster + `\r\n` |
| **Slug** | `plik-za-pari-copy-2` — unprofessional (L-01) |
| **Missing data** | Unique occasion/recipient angle; clean slug |

**Recommended structure:**

1. Rewrite body to state **which variant** this is (occasion/recipient) using admin truth.
2. Plan slug rename → `product_slug_history` 308 (data task, not code).
3. Title should include disambiguator (e.g. повод or получател).

---

## 3. `/products/plik-za-pari-mladozhentsi`

| Field | Current state |
|---|---|
| **Audit IDs** | H-02, H-03 |
| **Meta** | Cluster duplicate + `\r\n` |
| **Intent** | Младоженци (title signal) |
| **Missing data** | Body opening should lead with wedding couple context |

**Recommended structure:**

1. Intro: подарък за младоженци / сватба (matches title).
2. Персонализация clause if options exist.
3. Fulfillment from `fulfillmentNote`.

---

## 4. `/products/plik-za-pari-za-momicheta`

| Field | Current state |
|---|---|
| **Audit IDs** | H-01, H-03 |
| **Meta** | **33 chars** — critically thin |
| **Body** | Short; weak long-tail |
| **Missing data** | Recipient-specific prose (момичета); occasion examples |

**Recommended structure:**

1. Intro: плик за пари за момиче / детски празник (only if accurate).
2. Bullet or short list: персонализация, цвят (if configured).
3. Target length: body 80–120 words; meta will use code fallback until body is expanded.

---

## 5. `/products/plik-za-pari-za-krashtene`

| Field | Current state |
|---|---|
| **Audit IDs** | H-01, H-03 |
| **Meta** | **63 chars** — below 120 target |
| **Intent** | Кръщене (title) |
| **Missing data** | Кръщене-specific intro in first paragraph |

**Recommended structure:**

1. Lead with кръщене / кумове / кръстник context.
2. Separate from generic cluster opening.
3. Link occasion language to visible personalization options.

---

## 6. `/products/plik-za-pari-kartichka`

| Field | Current state |
|---|---|
| **Audit IDs** | H-01, H-03 |
| **Meta** | **49 chars** |
| **Differentiator** | „картичка“ format in title |
| **Missing data** | Explain card format vs standard envelope in body |

**Recommended structure:**

1. First sentence: how card format differs (only if true in product).
2. Use cases + personalization.
3. Avoid repeating identical paragraph from `plik-za-pari`.

---

## 7. `/products/tvorcheski-komplekt-valshebni-peperudi`

| Field | Current state |
|---|---|
| **Audit IDs** | H-01 |
| **Meta** | **26 chars** |
| **Category** | Творчески комплекти (assumed) |
| **Missing data** | Age range, contents, skill level — only if in admin |

**Recommended structure:**

1. Intro: творчески комплект за деца (age range **only if documented**).
2. What's included (from real `additionalInfo` or admin fields).
3. Fulfillment / made-to-order note from `fulfillmentNote`.

---

## Editorial QA checklist (per SKU)

- [ ] `description` normalized on save (optional CMS validation — future)
- [ ] Unique opening sentence vs siblings in same category
- [ ] Meta source ≥ 120 chars after normalization **or** rely on code fallback until body updated
- [ ] Occasion/recipient in title **and** first body paragraph aligned
- [ ] No fabricated material, GTIN, or dimensions
- [ ] Primary category assigned in admin for breadcrumbs and internal links

---

## Out of scope for this document

- Slug migrations (L-01) — separate data task with `product_slug_history`
- Related products (M-05) — admin configuration
- Category hub copy (M-03) — see audit §8.3
