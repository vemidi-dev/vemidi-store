# Meta Pixel polish MVP — implementation report

**Date:** 2026-08-13  
**Repo:** `D:\store-template`  
**Mode:** Code-only (no SQL, no CAPI, no commit/push)  
**Prior:** SEO Editor `0052de2`, Merchant feed `88bb1b2`

---

## Executive summary

Browser Meta Pixel MVP was already largely wired (PageView → Purchase behind marketing consent). This polish package:

- documents optional Pixel/GA env placeholders in `.env.example`;
- adds `docs/META_PIXEL.md`;
- aligns ecommerce payloads with consistent `currency` / `value` / `content_ids` / `content_type` / `contents` / `num_items`;
- enriches Purchase analytics client-side with cart slugs + `orderRef` as Meta `eventID` (no checkout RPC changes);
- extends tests for consent, empty Pixel ID, payload shape, and no PII.

---

## Events supported

| Event | Status | Notes |
|-------|--------|--------|
| PageView | ✓ | Consent loader + route changes |
| ViewContent | ✓ | + `contents` |
| AddToCart | ✓ | + `contents`, `num_items` |
| InitiateCheckout | ✓ | + `contents`, `num_items` |
| Purchase | ✓ | + `content_ids` / `contents`; optional `eventID` = `orderRef` |

---

## Payload fields

Common: `currency` (`EUR` for catalog events), `value`, `content_ids`, `content_type: "product"`, `contents[{id,quantity,item_price?}]`, `num_items` where applicable.

**No PII:** no email/phone/address/name fields in Meta payloads (product slugs only).

Purchase `eventID` uses short public `orderRef` when present (browser option for future CAPI dedup).

---

## Consent behavior

- No `NEXT_PUBLIC_META_PIXEL_ID` → no script / no events.
- Marketing consent false/null → no load / no events.
- Events require `fbq` after loader init.
- GA remains separate (`NEXT_PUBLIC_GA_MEASUREMENT_ID`, analytics consent).

---

## Changed files

### New

- `docs/META_PIXEL.md`
- `docs/meta-pixel-polish-mvp-report.md`

### Modified

- `.env.example` — optional `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `docs/TEMPLATE.md` — link to Meta Pixel doc
- `lib/consent/meta-pixel.ts` — payload polish + helpers
- `lib/consent/meta-pixel-client.ts` — Purchase `eventID`; loader attr `data-meta-pixel-loader`
- `lib/checkout/order-confirmation.ts` — optional `contentIds` / `contents` / `orderRef` on purchase analytics
- `components/checkout/checkout-panel.tsx` — client-side purchase enrichment (no RPC)
- `tests/meta-pixel.test.ts`
- `tests/order-confirmation.test.ts`

---

## Explicitly deferred (CAPI / later)

- Meta Conversions API
- Server `META_CAPI_ACCESS_TOKEN`
- Hashed PII / Advanced Matching
- Server purchase when consent granted after thank-you
- GA full ecommerce parity (`view_item`, `add_to_cart`, …)

---

## Tests / result

| Command | Result |
|---------|--------|
| `npm run typecheck` | **PASS** |
| Targeted Meta/consent/purchase tests | **21/21 PASS** |
| `npm run test:release:unit` | **PASS** |

Known unrelated noise: Node `DEP0190` from `release-tests.mjs` on Windows.

---

## `git status --short`

```
## main...origin/main
 M .env.example
 M components/checkout/checkout-panel.tsx
 M docs/TEMPLATE.md
 M lib/checkout/order-confirmation.ts
 M lib/consent/meta-pixel-client.ts
 M lib/consent/meta-pixel.ts
 M tests/meta-pixel.test.ts
 M tests/order-confirmation.test.ts
?? docs/META_PIXEL.md
?? docs/meta-pixel-polish-mvp-report.md
```

**Ready for review/commit:** yes. Not committed/pushed per request.
