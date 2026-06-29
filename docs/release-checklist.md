# VeMiDi Crafts — release checklist

Non-regression flow before preview deploy and production promote to [vemidi-crafts.com](https://vemidi-crafts.com).

---

## 1. Before commit (required)

Run locally on every release-bound change:

```bash
npm run test:release
```

Faster iteration without typecheck:

```bash
npm run test:release:unit
```

### What `test:release` covers

1. **Typecheck** — `tsc --noEmit`
2. **Admin & product lifecycle** — form data, wish template assignments, publish validation, publication status, admin preview
3. **Checkout & orders** — checkout edge cases, order confirmation / purchase payload
4. **Consent & analytics** — Google Consent Mode, GA4 purchase, Meta Pixel (no PII)
5. **Data audit (unit)** — audit report formatting and pure check logic (no live DB)
6. **SEO & routes** — info pages metadata, `robots.txt`, canonical `/produkti` routes

**15 test files**, ~80 assertions. Exit `0` = safe to commit from a test perspective.

---

## 2. Commit exclusions

Do **not** include in release commits:

| Exclude | Reason |
|---------|--------|
| `.codex-handoff.md` | Internal agent notes |
| `.tmp-*` | Scratch / audit copies |
| `next-env.d.ts` | Auto-generated |
| `.env`, `.env.local`, ENV files | Secrets |
| `D:\Cursor\butterfly-landing` | Separate Landing project |

---

## 3. Data audit (optional, read-only)

**Not** part of `test:release`. Requires Supabase ENV and an explicit decision about which DB to hit.

```bash
npm run test:release:data
```

Same as:

```bash
npm run data:audit
```

### Requirements

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- Intentional target (preview/staging DB preferred; **do not** run blindly against production)

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | No **critical** issues |
| `1` | Critical issues, fetch failure, or missing ENV |

### Critical vs warning

**Critical** (blocks promote):

- Product allows wish templates but has no `product_wish_templates` links
- Published product missing slug, category, or primary category
- Duplicate product/category slugs
- Orphan FK rows (`product_wish_templates`, `product_categories`, `product_faq_*`)
- Category `parent_id` pointing to missing category

**Warning** (review before promote):

- Active wish templates not assigned to any product
- Published product without image/gallery or subtitle
- Visible product category with no linked products

**Info** — counts and summaries only.

---

## 4. Preview deploy

1. Commit only in-scope files (see section 2).
2. Push branch / `main` as per your workflow.
3. Deploy to **Vercel Preview** only.
4. **Do not** promote to production or `vemidi-crafts.com` yet.
5. Note the preview URL from Vercel (e.g. `https://vemidi-store-xxxxx.vercel.app`).

Git push to `main` may trigger a Vercel production build via Git integration — verify in the Vercel dashboard that you are testing the **preview** URL, not production.

---

## 5. Preview smoke (after preview URL exists)

Lightweight HTTP checks — no browser, no auth, no writes.

```bash
npm run smoke:preview -- --base-url=https://your-preview-url.vercel.app
```

PowerShell:

```powershell
$env:BASE_URL="https://your-preview-url.vercel.app"
npm run smoke:preview
```

Optional extra paths (comma-separated):

```powershell
$env:SMOKE_PATHS="/categorii/example,/produkti/example-product"
npm run smoke:preview -- --base-url=https://your-preview-url.vercel.app
```

### Default URLs checked

| Path | Expectation |
|------|-------------|
| `/` | 200, contains `VeMiDi` |
| `/produkti` | 200 |
| `/categorii` | 200 |
| `/checkout` | 200 (not 5xx) |
| `/robots.txt` | 200, contains `sitemap` |
| `/sitemap.xml` | 200, valid sitemap markers |

Exit `0` = all checks passed. Do not pass production URL unless intentional.

---

## 6. Manual checks (on preview URL)

Use the preview deployment in a browser (incognito recommended for cookie tests).

### Storefront

- [ ] Homepage loads, navigation works
- [ ] `/produkti` — catalog renders
- [ ] `/categorii` — category hub renders
- [ ] Product detail — images, price, add-to-cart
- [ ] Add to cart → cart page
- [ ] Checkout form loads and submits (test order if needed)

### Admin

- [ ] Admin login
- [ ] Edit product — fields save correctly
- [ ] **Wish templates** — selector shows saved IDs; save preserves `product_wish_templates` links
- [ ] Create product draft / publish flow

### Cookie consent & tracking (if consent/GA/Meta changes in release)

- [ ] First visit — cookie banner appears
- [ ] Reject all — no `gtag/js`, no `fbevents.js`
- [ ] Analytics consent only — GA4 loads, no Meta
- [ ] Marketing consent only — Meta loads, no GA
- [ ] Footer „Настройки на бисквитките“ opens settings
- [ ] Thank-you page — purchase events per consent; refresh — no duplicate purchase

Requires Vercel Preview ENV when testing tracking:

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-BRJYG0WKXF
NEXT_PUBLIC_META_PIXEL_ID=<your pixel id>
```

---

## 7. Promote to production

Promote to **vemidi-crafts.com** only when **all** applicable steps pass:

| Step | Required |
|------|----------|
| `npm run test:release` | Yes |
| `npm run data:audit` | Yes, if DB ENV available and data-sensitive release |
| `npm run smoke:preview` | Yes, against preview URL |
| Manual checks (section 6) | Yes |
| Vercel ENV verified for production | Yes, if tracking enabled |

Then promote in Vercel dashboard (or approved production deploy workflow). Do not skip preview sign-off.

---

## Quick reference

| Command | When |
|---------|------|
| `npm run test:release` | Before every commit |
| `npm run test:release:unit` | Fast local loop |
| `npm run test:release:data` | Before promote, with ENV + DB decision |
| `npm run smoke:preview -- --base-url=...` | After preview deploy |

### Recommended order

```
test:release → commit → push → preview deploy → data:audit (optional) → smoke:preview → manual checks → promote
```
