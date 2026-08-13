# Meta Pixel (browser MVP)

Template-safe browser Meta Pixel for ecommerce events. **No Conversions API** and no server Meta access tokens in this MVP.

## Enable

1. Create a Meta Pixel in Events Manager.
2. Set in `.env.local` / Vercel:

```bash
# Optional — leave empty to disable Pixel entirely
NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id
```

3. Redeploy / restart the app.

Related optional analytics (separate consent category):

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
```

Both IDs are documented in `.env.example`. They are **optional** and **consent-gated**.

## Consent behavior

| Requirement | Behavior |
|-------------|----------|
| Missing / empty `NEXT_PUBLIC_META_PIXEL_ID` | Pixel script is not loaded; no `fbq` calls |
| Marketing consent denied / unset | Pixel is not loaded; events are not sent |
| Marketing consent granted + Pixel ID set | Loader injects `fbevents.js`, `fbq('init')`, then events |

Loader: `components/consent/meta-pixel-consent-loader.tsx` (inside cookie consent provider).

Do **not** bypass marketing consent for Meta events.

## Events sent

| Event | When |
|-------|------|
| `PageView` | After init + on client route changes |
| `ViewContent` | Product detail page |
| `AddToCart` | Cart add |
| `InitiateCheckout` | Checkout panel open with cart |
| `Purchase` | Thank-you page (one-shot from session storage) |

## Payload shape (no PII)

Ecommerce payloads use product **slugs** as ids (not emails/phones/names/addresses).

Typical fields:

- `currency`: `"EUR"`
- `value`
- `content_ids`
- `content_type`: `"product"`
- `contents`: `[{ id, quantity, item_price? }]`
- `num_items` (AddToCart / InitiateCheckout / Purchase)
- `content_name` (ViewContent / AddToCart)

Purchase may also pass Meta `eventID` = short public `orderRef` (non-PII) for future CAPI dedup. Browser Pixel only today.

## How to test

1. Grant marketing cookies in the storefront banner.
2. Open Chrome with [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/).
3. Walk: home → product → add to cart → checkout → place order → thank-you.
4. Confirm events in Pixel Helper and Meta Events Manager (Test Events).

Without Pixel ID or without marketing consent, Helper should show no Pixel / no events.

## Deferred (not in this MVP)

- Meta Conversions API (server)
- `META_CAPI_ACCESS_TOKEN` / hashed PII
- Advanced Matching
- Server-side purchase fallback when consent is granted after thank-you
- GA ecommerce parity beyond thin purchase

See also: `docs/feature-roadmap-seo-merchant-meta.md` §C.
