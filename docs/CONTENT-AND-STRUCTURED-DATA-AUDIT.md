# Content & Structured Data Audit — VeMiDi crafts

**Project:** `D:\Cursor\src`
**Audit date:** 2026-06-15
**Branch:** `main` (deploy baseline `18cad4b`)
**Production:** https://vemidi-store.vercel.app
**Method:** Read-only code review + production HTML/JSON-LD sampling (all 7 sitemap products, 3 indexable + 2 hub categories, `/`, `/shop`)
**Scope:** Product/category **content** quality and **structured data** accuracy — no app, DB, or data changes

**Related docs:** `docs/TECHNICAL-SEO-AUDIT.md`, `docs/PRODUCTION-SEO-VERIFICATION.md`

---

## 1. Executive summary

Technical SEO (HTTP status, redirects, robots, sitemap hygiene) is **launch-ready** after `18cad4b`. This audit focuses on **editorial content** and **rich-result data quality** ahead of scaling to ~200 products.

**Strengths**

- Unique `<title>` and H1 per live product; H1 matches product name.
- Canonical URLs, indexable products in sitemap, BreadcrumbList JSON-LD on products and categories.
- Product JSON-LD includes real `name`, `description`, `sku` (product code), `price`, `priceCurrency`, `availability` mapped from fulfillment state, `brand`, `itemCondition`.
- No fabricated `AggregateRating`, `Review`, or GTIN — correct for current catalog.
- Category indexability rules (`noindex` empty hubs, sitemap filter) work as designed.
- Visible breadcrumb trail on category pages; global `Organization` + `WebSite` on all pages.

**Biggest gaps before catalog scale**

1. **Thin and duplicated meta descriptions** on several products (26–63 chars; repeated wedding-envelope copy).
2. **Literal `\r\n` in meta descriptions** leaked from CMS text into `<meta name="description">`.
3. **Product pages lack visible breadcrumb navigation** (JSON-LD only) and **inline links to category/occasion** hubs.
4. **No documented/enforced product lifecycle SEO** for sold-out, discontinued, or hidden products (all DB rows currently surface in catalog + sitemap).
5. **Category pages rely on short `card_description` or generic fallbacks** — insufficient unique SEO body copy for competitive queries.
6. **Merchant-oriented schema optional fields** (`seller`, `shippingDetails`, `hasMerchantReturnPolicy`) are absent — acceptable without reliable structured shipping/return data, but worth planning.

**Verdict:** **Conditionally ready for content scale** — ship templates and lifecycle policy before bulk import; fix High editorial/code hygiene items in the first content sprint. No Critical structured-data fraud or blocking schema errors on the live sample.

---

## 2. Findings first (by severity)

### Critical

_None — no invalid/fake rich-result data or indexable 404 product URLs in production sample._

### High

| ID | Finding | Affected URLs / files | Evidence | SEO risk | Recommendation | Work type |
|---|---|---|---|---|---|---|
| H-01 | **Thin meta descriptions** on multiple products | `/products/plik-za-pari-za-momicheta` (33 chars), `/products/tvorcheski-komplekt-valshebni-peperudi` (26 chars) | Production HTML `meta description`; `lib/seo/product-metadata.ts` slices `product.description` to 160 | Weak CTR; Google may rewrite snippets; poor relevance at scale | Enforce min **120–155 chars** in content QA; use description template (§8) | Editorial + validation |
| H-02 | **Literal `\r\n` in meta description** | `/products/plik-za-pari`, `/products/plik-za-pari-copy-2`, `/products/plik-za-pari-mladozhentsi` | Production meta contains `\r\n`; JSON-LD `description` also has raw newlines (`descHasCrLf: true`) | Broken/unprofessional snippets; JSON-LD quality flags | Strip/normalize whitespace in `buildProductPageMetadata` **and** sanitize on admin save | Code + editorial |
| H-03 | **Near-duplicate product copy** in money-envelope cluster | 5× `/products/plik-za-pari*` | Same opening paragraph across variants; only title differs | Cannibalization; duplicate meta risk at 200 SKUs | Differentiate by **occasion, recipient, personalization, dimensions** per variant | Editorial |
| H-04 | **No visible breadcrumb trail on product pages** | All `/products/[slug]` | `app/products/[slug]/page.tsx` — only «Назад към магазина»; BreadcrumbList JSON-LD present | UX + internal linking; missed crawl paths to categories | Add visible breadcrumbs matching `buildProductBreadcrumbItems` | Code |
| H-05 | **No product lifecycle SEO policy in code** | `app/sitemap.ts`, `lib/storefront/repository.ts` | All products loaded without `is_sold_out` / `unavailable` filter; sold-out still indexable if flagged | Sold-out/discontinued URLs stay in index/sitemap | Implement policy in §7; filter sitemap when policy says noindex | Code + data |

### Medium

| ID | Finding | Affected URLs / files | Evidence | SEO risk | Recommendation | Work type |
|---|---|---|---|---|---|---|
| M-01 | **Meta description = blind truncate** | `lib/seo/product-metadata.ts` L11 | `product.description.slice(0, 160)` — no word boundary, no newline strip | Mid-word cuts; `\r\n` leakage | `normalizeMetaDescription(text, max=155)` helper | Code |
| M-02 | **Product body lacks structured attributes** | Product pages | Visible: fulfillment grid + free text only; no material/size/color fields in catalog model | Weak long-tail coverage (e.g. „плик за пари за кръщене персонализиран“) | Add optional CMS fields or structured blocks; map into description template | Data + editorial |
| M-03 | **Category SEO text is thin** | `/categories/plik-za-pari` (OK card desc), `/categories/family` (generic fallback) | `lib/seo/category-metadata.ts` L25–27; category page hero `description` only | Thin content vs competitors; hubs lack depth | 80–150 word unique intro per leaf; 40–80 for hubs (§8) | Editorial |
| M-04 | **Product pages lack inline category links** | `/products/*` | Breadcrumb JSON-LD links categories but no `<a href="/categories/...">` in body | Weak internal PageRank flow | Link primary category name in intro or below H1 | Code + editorial |
| M-05 | **Related products empty** | All 7 sampled products (`hasRelatedSection: false`) | `related_products` table / admin not populated | Missed cross-sell + internal links | Configure 2–4 related products per SKU in admin | Data |
| M-06 | **Offer schema missing Merchant optional fields** | `app/products/[slug]/page.tsx` L122–139 | No `seller`, `shippingDetails`, `hasMerchantReturnPolicy` | May limit Merchant listings eligibility | Add only when return/shipping rules are structured (see §5) | Code (later) |
| M-07 | **Hub categories noindex but nav-linked** | `/categories/kutii`, `/categories/skandinavski-muh` | `robots: noindex, follow`; absent from sitemap | Intentional per `category-indexability.ts`; acceptable | Keep; ensure hubs have child products or reduce nav prominence for empty hubs | Editorial/strategy |

### Low

| ID | Finding | Affected URLs / files | Evidence | SEO risk | Recommendation | Work type |
|---|---|---|---|---|---|---|
| L-01 | **Editorial slug `plik-za-pari-copy-2`** | `/products/plik-za-pari-copy-2` | Sitemap + canonical use `-copy-2` | Unprofessional URL; weak keyword signal | Rename slug via admin + `product_slug_history` redirect | Data |
| L-02 | **Open Graph `type: website` on products** | `lib/seo/product-metadata.ts` L20 | Next.js Metadata API limitation (documented Phase 3) | Minor social preview semantics | Accept or use custom meta tags later | Code (optional) |
| L-03 | **No GTIN / reviews in schema** | All products | Grep: no `AggregateRating`/`gtin` in codebase | None — **correct** not to invent | Add GTIN only if real barcodes exist; reviews only with verified UGC | Data (if available) |
| L-04 | **Category page duplicate heading semantics** | `/categories/[slug]` | Hero H1 + product grid H2 repeats category name | Minor accessibility/SEO noise | Use H2 only for grid section label (e.g. „Продукти в категорията“) | Code |

---

## 3. Product content audit

### Production sample (all 7 sitemap products)

| URL | Title (unique) | Meta desc len | H1 = title | robots | Schema availability |
|---|---|---:|---|---|---|
| `/products/plik-za-pari` | ✓ | ~160 (with `\r\n`) | ✓ | index | PreOrder |
| `/products/plik-za-pari-copy-2` | ✓ | ~160 (dup + `\r\n`) | ✓ | index | PreOrder |
| `/products/plik-za-pari-mladozhentsi` | ✓ | ~160 (dup + `\r\n`) | ✓ | index | PreOrder |
| `/products/plik-za-pari-za-momicheta` | ✓ | **33** | ✓ | index | PreOrder |
| `/products/plik-za-pari-za-krashtene` | ✓ | 63 | ✓ | index | PreOrder |
| `/products/plik-za-pari-kartichka` | ✓ | 49 | ✓ | index | PreOrder |
| `/products/tvorcheski-komplekt-valshebni-peperudi` | ✓ | **26** | ✓ | index | PreOrder |

**Sold-out sample:** None in current production catalog (no „Изчерпан“ on `/shop`). Lifecycle policy in §7 still required before scale.

### Title

- **Implementation:** `buildProductPageMetadata` → `title: product.title`; layout template adds `| VeMiDi crafts`.
- **Quality:** Unique per SKU; descriptive Bulgarian names.
- **Gap:** Variant disambiguation in title (e.g. „за момичета“, „за кръщене“) is inconsistent — some titles strong, cluster duplicates weak.

### Meta description

- **Source:** First 160 chars of `product.description` only (`lib/seo/product-metadata.ts`).
- **Gaps:** No min length; no whitespace normalization; duplicates across cluster; several below 120 chars.

### H1 & search intent

- H1 equals `product.title` — good 1:1 match.
- Primary intent generally clear (подарък / плик за пари / творчески комплект).
- **Missing:** Occasion-led modifiers in body copy for long-tail (сватба, кръщене, рожден ден) on thin pages.

### Body content & helpful attributes

**Present on page (visible):**

- Product description + optional `additionalInfo`
- Fulfillment note, delivery (Еконт/Спиди), returns teaser with links to `/delivery`, `/returns`
- Personalization via cart options (not always reflected in static HTML text)
- Related products block (when configured in DB)

**Missing or weak for SEO:**

- Material, dimensions, color options as scannable list
- Occasion targeting in prose
- Category/occasion inline links
- Visible breadcrumbs

### Internal linking

| Link type | Status |
|---|---|
| → `/shop` | ✓ (back link) |
| → `/delivery`, `/returns`, `/contact` | ✓ |
| → primary category | JSON-LD only (H-04) |
| → related products | ✗ (not configured, M-05) |
| → occasions | ✗ |

### Breadcrumbs

| Layer | Product pages | Category pages |
|---|---|---|
| JSON-LD BreadcrumbList | ✓ (4 items typical) | ✓ (3 items) |
| Visible HTML trail | ✗ (back link only) | ✓ (hero eyebrow links) |

### Product states (current code behavior)

| State | HTTP | robots | Sitemap | Notes |
|---|---|---|---|---|
| Published, orderable | 200 | index (default layout) | Included | All 7 live products |
| `soldOut` / `unavailable` | 200 | **index** (no override) | **Included** | Policy gap H-05 |
| Invalid slug | 404 | noindex, nofollow | Excluded | Verified post-`18cad4b` |
| UUID / stale slug | 308 → canonical | noindex during redirect | Canonical slug only | `lib/product-route.ts` |

---

## 4. Category content audit

### Production sample

| URL | Index? | Sitemap? | H1 | Meta description source | Products in grid |
|---|---|---|---|---|---|
| `/categories/plik-za-pari` | index | ✓ | Пликове за пари | `card_description` (custom) | ✓ |
| `/categories/family` | index | ✓ | Семейни подаръци | **Generic fallback** | ✓ |
| `/categories/tvorcheski-komplekti` | index | ✓ | Творчески комплекти | `card_description` | ✓ |
| `/categories/kutii` | **noindex** | ✗ | Кутийки и кошнички | `card_description` | hub / children |
| `/categories/skandinavski-muh` | **noindex** | ✗ | Скандинавски мъх | `card_description` | empty |

### Title, description, H1

- **Title:** `category.name` + template suffix — unique.
- **Meta description:** `card_description` or generic „Разгледайте ръчно изработени продукти…“ (`category-metadata.ts`).
- **H1:** Category name in hero — matches intent.

### Thin / duplicate content

- Leaf categories with `card_description` are acceptable short intros but **below competitive depth** for SEO landing pages.
- `family` uses generic fallback — **duplicate pattern risk** if many categories lack `card_description`.
- No dedicated long-form SEO block below the fold.

### Parent/child & internal linking

- Child categories rendered as `CategoryShowcaseCard` grid when `parent_id` chain exists.
- Products linked via `ProductCard` → `/products/{slug}`.
- Breadcrumbs: home → categories → [parent] → current.

### Indexability & sitemap (code)

- `isProductCategoryIndexable` — index only if family has ≥1 product (`category-indexability.ts`).
- `filterIndexableProductCategories` drives sitemap — aligns with production (3 category URLs).

---

## 5. Structured data audit

### Schema inventory (production)

| Schema | Where | Sample status |
|---|---|---|
| Organization | `app/layout.tsx` via `buildOrganizationSchema` | ✓ Valid; email, phone, logo, sameAs |
| WebSite | Global layout | ✓ Valid; no SearchAction (intentional) |
| Product + Offer | `/products/[slug]/page.tsx` | ✓ Present on all 7 products |
| BreadcrumbList | Product + category pages | ✓ Single block per page |
| AggregateRating | — | **Absent** (correct) |
| Review | — | **Absent** (correct) |

### Product / Offer — field checklist

| Property | Status | Notes |
|---|---|---|
| `@type` Product | ✓ | |
| `name` | ✓ | Matches H1 |
| `description` | ✓ | Full DB text (includes `\r\n` on some) |
| `image` | ✓ | Primary image URL when set |
| `url` | ✓ | Absolute canonical product URL |
| `sku` | ✓ | `product.productCode` (e.g. VM-000001) |
| `brand` | ✓ | Hardcoded „VeMiDi crafts“ — matches real brand |
| `gtin*` | ✗ | **Do not add** without real barcodes |
| `offers.price` | ✓ | Matches visible price |
| `offers.priceCurrency` | ✓ | EUR |
| `offers.availability` | ✓ | Mapped: PreOrder / InStock / OutOfStock (`product-schema-availability.ts`) |
| `offers.itemCondition` | ✓ | NewCondition |
| `offers.priceValidUntil` | ✓ | Only when promotion `endsAt` set |
| `offers.seller` | ✗ | Optional; add Organization ref if pursuing Merchant listings |
| `shippingDetails` | ✗ | Optional; needs structured delivery rules |
| `hasMerchantReturnPolicy` | ✗ | Optional; link to `/returns` policy when modelled |
| `aggregateRating` / `review` | ✗ | **Must not add** without real reviews |

### Duplicate / conflicting blocks

- One Product block per product page; global Organization/WebSite separate — **no conflict**.
- BreadcrumbList is standalone — **no duplicate**.

### Code vs production alignment

| Check | Code | Production |
|---|---|---|
| Availability PreOrder for made_to_order | `resolveSchemaOrgProductAvailability` | ✓ All 7 products PreOrder |
| OutOfStock when soldOut | Unit-tested | Not observable (no sold-out SKU live) |
| SKU in schema | `product.productCode` | ✓ VM-000xxx |

---

## 6. Schema-to-visible-content comparison

| Field | Visible on page | JSON-LD | Match? |
|---|---|---|---|
| Product name | H1 | `name` | ✓ |
| Description | Body paragraph | `description` | ✓ (same source; newlines differ in meta only) |
| Price | `ProductPrice` component | `offers.price` | ✓ |
| Availability label | Badge when not „В наличност“ | `offers.availability` | ✓ (semantic mapping) |
| Brand | Footer/header „VeMiDi crafts“ | `brand.name` | ✓ |
| SKU / product code | Not shown to customer | `sku` | ⚠ Acceptable — identifier not required visible |
| Breadcrumb path | Categories: visible; Products: **not visible** | BreadcrumbList | ⚠ JSON-LD richer than UX on products |
| GTIN | — | — | N/A |
| Reviews | — | — | N/A |

---

## 7. Product lifecycle SEO policy (recommended)

| Scenario | HTTP | robots | canonical | sitemap | internal links | Product/Offer schema | URL behavior |
|---|---|---|---|---|---|---|---|
| **A. Temporarily sold out** (will return) | 200 | `index, follow` | self | **Keep** | Keep; show badge „Изчерпан“ | `OutOfStock`; keep Offer with price | Keep page |
| **B. Made-to-order pause** (`unavailable`, temporary) | 200 | `index, follow` | self | Keep | Keep with „Временно недостъпен“ | `OutOfStock` | Keep page |
| **C. Discontinued with replacement** | **301/308** | — | replacement product | Remove old; add replacement | Update links to replacement | Remove Product on old URL | Redirect to replacement `/products/{slug}` |
| **D. Discontinued without replacement** | 200 or 410 | **`noindex, follow`** | self | **Remove** | Remove from nav/featured; keep category context | `OutOfStock` or remove Offer | Keep URL for inbound links or 410 after 6–12 months |
| **E. Unpublished / invalid** | **404** | `noindex, nofollow` | — | Exclude | Remove all | None | `notFound()` (current) |
| **F. Hidden admin-only** (future flag) | 404 or 401 | noindex | — | Exclude | Remove | None | Treat as E |

**Implementation notes (future — not in this audit):**

- Filter `app/sitemap.ts` when `soldOut || !orderable` per policy row A vs D.
- Add `generateMetadata` robots override for discontinued (D).
- Use `product_slug_history` for redirects (C).

**Current gap:** Rows A/B/D not differentiated in sitemap or metadata — all products always indexable (H-05).

---

## 8. Recommended templates (Bulgarian, ~200 SKU catalog)

Templates use **real fields** from `Product` / `StorefrontCategory`. Placeholders in `{curly}`. Avoid stuffing; vary optional clauses.

### 8.1 Product title

**Formula:** `{product.title}` (admin) — keep human-written; optional auto-suggest:

`{baseName} – {occasionOrRecipient}{, персонализация}`

**Length:** 45–60 characters visible (before `| VeMiDi crafts` suffix); max ~70 chars in admin title.

**Rules:**

- One primary keyword phrase per product.
- Include differentiator vs siblings (occasion, recipient, format).
- No ALL CAPS; no emoji.

**Examples:**

1. `Персонализиран плик за пари за сватба – с имена`
2. `Творчески комплект „Вълшебни пеперуди“ за деца 4–8 г.`
3. `Дървена кутия за спомени със скандинавски мъх – рожден ден`

### 8.2 Product meta description

**Formula:**

`{benefitSentence} {differentiator}. {personalizationClause} {fulfillmentClause} {cta}`

- `{benefitSentence}` — 1 sentence from custom intro (not raw paste of full description)
- `{differentiator}` — occasion/recipient/material
- `{personalizationClause}` — „Изберете цвят и текст.“ or omit if N/A
- `{fulfillmentClause}` — `fulfillmentNote` or „Изработка 5–10 работни дни.“
- `{cta}` — „Поръчайте онлайн от VeMiDi crafts.“

**Length:** 120–155 characters (after normalization).

**Examples:**

1. `Дървен плик за пари за сватба с персонален надпис и избор на цвят. Изработка 5–10 дни. Поръчайте онлайн от VeMiDi crafts.`
2. `Творчески комплект за деца с пеперуди и цветни материали — подходящ за подарък. Доставка с Еконт или Спиди.`
3. `Елегантен семеен подарък с ръчна изработка и опция за персонализация. Вижте размери и цветове на страницата.`

**Fallback when `description` short:** Build from `{title} + {category.name} + {fulfillmentNote}`; flag in CMS if &lt; 120 chars.

### 8.3 Product H1

**Formula:** `{product.title}` — must match customer-facing name exactly.

**Uniqueness:** H1 unique per URL; if title variants share a base, H1 must include the differentiating phrase (not just meta title).

**Examples:** Same as §8.1 examples (H1 without brand suffix).

### 8.4 Product description (body structure)

```markdown
## Кратко въведение (2–3 изречения)
{Какво е + за кого + основна полза}

## За кой повод е подходящ
{сватба / кръщене / рожден ден / … — от categories/occasions}

## Характеристики
- Материал: {…}
- Размери: {…}
- Цвят: {от color options или „по избор“}
- Персонализация: {да/не + какво}

## Изработка и доставка
{fulfillmentNote}
Доставка с Еконт или Спиди. [Вижте условията](/delivery).

## Поддръжка
{1–2 изречения или линк към /returns}

## Вижте също
- [Категория {category.name}](/categories/{slug})
- [Сродни продукти — автоматичен блок]
```

**Example (short):**

> Дървеният плик за пари е ръчно изработен подарък за сватба, с възможност за имена и кратко пожелание. Подходящ за тържествен стил и снимки с младоженци.
>
> **Характеристики:** дърво, велюр; размер 18×12 cm; цвят по избор. **Персонализация:** до 2 реда текст.
>
> Изработваме за 5–10 работни дни след потвърждение на текста. Доставяме с Еконт или Спиди.

### 8.5 Category title

**Formula (leaf):** `{category.name}`
**Formula (hub):** `{category.name}` (same; rely on `card_description` for nuance)

**Length:** 20–45 chars.

**Examples:** `Пликове за пари` · `Творчески комплекти` · `Кутийки и кошнички`

### 8.6 Category meta description

**Formula (leaf):**

`{card_description or custom} Ръчно изработени {category.nameLower} от VeMiDi crafts с опция за персонализация.`

**Formula (hub):**

`Разгледайте {category.nameLower}: {childCategoryList or benefit}. Изберете подкатегория или вижте всички продукти.`

**Length:** 120–155 chars.

**Examples:**

- Leaf: `Елегантни пликове за пари за всеки специален повод. Ръчна изработка и персонален текст. VeMiDi crafts.`
- Hub: `Кутийки и кошнички за подаръци и спомени — разгледайте подкатегории и ръчно изработени предложения.`

### 8.7 Category H1

**Formula:** `{category.name}` — matches title intent.

### 8.8 Category SEO body text

**Leaf (80–150 words):** Expand `card_description` with who it's for, materials, personalization, link to `/shop` filtered or top products.

**Hub (40–80 words):** Explain subcategory structure; link to children; avoid indexing thin hubs (current `noindex` policy OK).

---

## 9. Implementation plan (~200 products)

| Phase | Scope | Effort | Owner |
|---|---|---|---|
| **1. Hygiene sprint** | Fix H-02 meta normalization (code); strip `\r\n` in CMS; rewrite 7 live meta descriptions | 1–2 days | Dev + content |
| **2. Templates & CMS** | Document templates in admin; add optional fields (material, dimensions, seo_intro); min-length validation | 3–5 days | Dev + content |
| **3. Category pass** | `card_description` for all product categories; unique SEO paragraph per indexable leaf | 2–3 days | Content |
| **4. Product lifecycle** | Implement §7 policy in sitemap + metadata; admin UX for discontinued | 2–3 days | Dev |
| **5. UX linking** | Visible product breadcrumbs (H-04); category link in body (M-04) | 1–2 days | Dev |
| **6. Bulk import** | Apply templates on import; QA checklist per SKU; related products | Ongoing | Content |
| **7. Schema enhancements** | `seller`, return policy in schema only when structured data exists | 1–2 days | Dev (optional) |
| **8. Scale QA** | Sample 10% of catalog monthly; Search Console rich results | Ongoing | SEO |

**Priority order:** 1 → 2 → 3 → 5 → 4 → 6 → 7 → 8

---

## 10. Acceptance criteria & verification checklist

### Per new/updated product

- [ ] Unique title (45–70 chars) with differentiator
- [ ] Meta description 120–155 chars, no `\r\n`, no duplicate of another SKU
- [ ] H1 = title
- [ ] Body follows §8.4 structure; ≥ 120 words for indexable SKUs
- [ ] Primary category assigned; related products set (2–4)
- [ ] JSON-LD: price, availability match visible state
- [ ] Canonical `/products/{slug}`; in sitemap iff indexable per §7
- [ ] Rich Results Test / Schema Validator — no errors

### Per category

- [ ] Unique `card_description` (not generic fallback)
- [ ] Indexability matches product count rules
- [ ] BreadcrumbList validates
- [ ] If hub empty → `noindex` + excluded from sitemap

### Regression (production smoke)

- [ ] Sample 5 products + 2 categories after deploy
- [ ] No fake ratings/GTIN
- [ ] Sold-out product follows §7 row when implemented

---

## Appendix — Code reference map

| Concern | File |
|---|---|
| Product metadata | `lib/seo/product-metadata.ts` |
| Product JSON-LD | `app/products/[slug]/page.tsx` |
| Availability mapping | `lib/seo/product-schema-availability.ts` |
| Category metadata | `lib/seo/category-metadata.ts` |
| Category indexability | `lib/seo/category-indexability.ts` |
| Breadcrumbs | `lib/seo/breadcrumbs.ts` |
| Organization schema | `lib/seo/organization-schema.ts` |
| Sitemap | `app/sitemap.ts` |
| Catalog load (no publish filter) | `lib/storefront/repository.ts` |

---

*Read-only audit. No application code, Supabase schema, product data, commit, push, or deploy performed.*
