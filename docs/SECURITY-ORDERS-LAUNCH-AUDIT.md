# Security, Orders & Admin вЂ” Launch-Blocker Audit

**РџСЂРѕРµРєС‚:** `D:\Cursor\src`
**Р”Р°С‚Р°:** 14 СЋРЅРё 2026
**Р РµР¶РёРј:** READ-ONLY (Р±РµР· СЂРµРґР°РєС†РёРё РЅР° РєРѕРґ, SQL, commit, push, deploy РёР»Рё production write)
**Production:** https://vemidi-store.vercel.app
**Р‘Р°Р·Р°:** `docs/PRE_PRODUCTION_AUDIT.md` (12 СЋРЅРё 2026) вЂ” С‡Р°СЃС‚ РѕС‚ РєРѕРЅС‚РµРєСЃС‚Р° Рµ РѕСЃС‚Р°СЂСЏР» (slug/code РІРµС‡Рµ СЃР° live); С‚РѕР·Рё РѕРґРёС‚ РїРѕРєСЂРёРІР° СЃР°РјРѕ security, checkout, РїРѕСЂСЉС‡РєРё Рё Р°РґРјРёРЅРёСЃС‚СЂР°С†РёСЏ.

**РњРµС‚РѕРґ:** РЎС‚Р°С‚РёС‡РµРЅ РїСЂРµРіР»РµРґ РЅР° server actions, API routes, Supabase RPC/RLS SQL, middleware, env РјРѕРґРµР», РёРјРµР№Р»/shipping РёРЅС‚РµРіСЂР°С†РёРё Рё СЃСЉС‰РµСЃС‚РІСѓРІР°С‰Рё С‚РµСЃС‚РѕРІРµ. Р‘РµР· destructive С‚РµСЃС‚РѕРІРµ, СЂРµР°Р»РЅРё РїРѕСЂСЉС‡РєРё РёР»Рё production write.

---

## Executive summary

Р—Р° РјР°Р»СЉРє COD РјР°РіР°Р·РёРЅ (7 РїСЂРѕРґСѓРєС‚Р°) **РєСЂРёС‚РёС‡РЅРё security exploit-Рё РЅРµ СЃР° РѕС‚РєСЂРёС‚Рё**: С†РµРЅРѕРѕР±СЂР°Р·СѓРІР°РЅРµС‚Рѕ Рё РЅР°Р»РёС‡РЅРѕСЃС‚С‚Р° СЃР° authoritative РІ `create_store_order` (service role only); РєР»РёРµРЅС‚СЉС‚ РЅРµ РјРѕР¶Рµ РґР° РїРѕРґРјРµРЅРё С†РµРЅР°, РїСЂРѕРјРѕС†РёСЏ РёР»Рё РґРѕСЃС‚Р°РІРєР° Р·Р° С„РёРЅР°Р»РЅРёСЏ total; РїРѕСЂСЉС‡РєРёС‚Рµ РёРјР°С‚ idempotency Рё concurrent guard; admin actions/RPC РёР·РёСЃРєРІР°С‚ `checkIsAdmin` / `assert_admin()`; service-role РєР»СЋС‡СЉС‚ Рµ `server-only`.

**Р’РµСЂРґРёРєС‚: GO** Р·Р° security/orders launch РїСЂРё СѓСЃР»РѕРІРёРµ, С‡Рµ production env Рµ РєРѕРЅС„РёРіСѓСЂРёСЂР°РЅ (`RESEND_*`, `ORDER_NOTIFICATION_FROM`, `ECONT_*`, `CHECKOUT_RATE_LIMIT_SECRET`) Рё РµРєРёРїСЉС‚ РїСЂРёРµРјР° РѕРїРµСЂР°С†РёРѕРЅРЅРёСЏ СЂРёСЃРє РѕС‚ Р»РёРїСЃР° РЅР° email retry (РїРѕСЂСЉС‡РєРёС‚Рµ РѕСЃС‚Р°РІР°С‚ РІ `/admin`).

**Р РµР°Р»РЅРё security launch blockers: 0**
**Critical: 0 | High: 2** (РѕРїРµСЂР°С†РёРѕРЅРЅРё/abusРµ СЂРёСЃРєРѕРІРµ, РЅРµ price-fraud РёР»Рё data breach)

---

## Р”РѕР±СЂРµ Р·Р°С‰РёС‚РµРЅРё РѕР±Р»Р°СЃС‚Рё (РєСЂР°С‚РєРѕ)

| РћР±Р»Р°СЃС‚ | Р”РѕРєР°Р·Р°С‚РµР»СЃС‚РІРѕ |
|--------|---------------|
| РЎСЉСЂРІСЉСЂРЅРѕ С†РµРЅРѕРѕР±СЂР°Р·СѓРІР°РЅРµ | RPC Р·Р°СЂРµР¶РґР° `products.price`, РїСЂРѕРјРѕС†РёРё Рё option deltas РѕС‚ DB вЂ” `supabase/product_inventory_checkout_hardening.sql:210вЂ“371` |
| РљР»РёРµРЅС‚СЃРєР° С†РµРЅР° СЃРµ РёРіРЅРѕСЂРёСЂР° | `app/checkout/actions.ts:312вЂ“319` вЂ” РІ RPC РѕС‚РёРІР°С‚ СЃР°РјРѕ `productId`, `quantity`, РїРµСЂСЃРѕРЅР°Р»РёР·Р°С†РёСЏ/РѕРїС†РёРё; `price` РѕС‚ cart РЅРµ СЃРµ РїСЂРµРґР°РІР° |
| RPC СЃР°РјРѕ Р·Р° service role | `product_inventory_checkout_hardening.sql:453вЂ“456` вЂ” `revoke` РѕС‚ anon/authenticated; `grant` СЃР°РјРѕ `service_role` |
| Idempotency + concurrent dupes | `store_order_requests` ON CONFLICT; `order_request_in_progress` вЂ” `product_inventory_checkout_hardening.sql:72вЂ“88` |
| РРјРµР№Р» РіСЂРµС€РєР° в‰  РїРѕРІС‚РѕСЂРЅР° РїРѕСЂСЉС‡РєР° | Order СЃРµ Р·Р°РїРёСЃРІР° РїСЂРµРґРё email; catch Р±РµР· rethrow вЂ” `app/checkout/actions.ts:379вЂ“387`, `lib/orders/send-order-notifications.ts:8вЂ“11` |
| Order snapshot | `raw_payload.order.items` СЃ unit/line prices, РѕРїС†РёРё, stock snapshots вЂ” `product_inventory_checkout_hardening.sql:350вЂ“441` |
| Admin gate | `getAuthorizedClient()` / `checkIsAdmin` вЂ” `app/admin/actions.ts:385вЂ“410`; orders RLS вЂ” `supabase/admin_orders_access.sql` |
| Checkout rate limit | 8 req / 15 min per fingerprint вЂ” `app/checkout/actions.ts:151вЂ“168` |
| Upload validation | MIME + magic bytes + 5 MB вЂ” `lib/admin/storage.ts:19вЂ“55`; bucket limits вЂ” `security_hardening_phase1.sql:73вЂ“77` |
| Service role РЅРµ РІ РєР»РёРµРЅС‚Р° | `lib/supabase/service.ts:1` (`server-only`); РЅСЏРјР° `NEXT_PUBLIC_*SECRET` РІ TS/TSX |
| JSON-LD XSS mitigation | `serializeJsonLd` escape РЅР° `<` вЂ” `lib/seo/json-ld.ts:48вЂ“49` |

---

## Critical findings

*РќСЏРјР° РѕС‚РєСЂРёС‚Рё Critical findings Р·Р° launch.*

РџСЂРѕРІРµСЂРµРЅРёС‚Рµ РІРµРєС‚РѕСЂРё (client price tampering, direct RPC РѕС‚ Р±СЂР°СѓР·СЉСЂ, non-admin order read/write, service-role leak) СЃР° Р·Р°С‚РІРѕСЂРµРЅРё РІ РєРѕРґР° Рё SQL grants.

---

## High findings

### H-01 вЂ” РќРѕС‚РёС„РёРєР°С†РёРё РїСЂРё РїРѕСЂСЉС‡РєР° Р±РµР· durable retry/outbox

| | |
|---|---|
| **Р¤Р°Р№Р»/СЂРµРґ** | `lib/orders/send-order-notifications.ts:8вЂ“11`, `89вЂ“135`; `app/checkout/actions.ts:379вЂ“387` |
| **Р”РѕРєР°Р·Р°С‚РµР»СЃС‚РІРѕ** | РљРѕРјРµРЅС‚Р°СЂ вЂћFuture work: durable retry/outboxвЂњ; РїСЂРё Resend timeout/5xx СЃРµ Р»РѕРіРІР° `console.error` Рё checkout РІСЂСЉС‰Р° `ok: true`. РќСЏРјР° С‚Р°Р±Р»РёС†Р°/outbox, cron РёР»Рё alert. |
| **РЎС†РµРЅР°СЂРёР№** | Resend Рµ down 30 РјРёРЅ РїРѕ РІСЂРµРјРµ РЅР° launch traffic. РџРѕСЂСЉС‡РєРёС‚Рµ СЃРµ Р·Р°РїРёСЃРІР°С‚, РЅРѕ admin Рё РєР»РёРµРЅС‚ РЅРµ РїРѕР»СѓС‡Р°РІР°С‚ РёРјРµР№Р». Р•РєРёРїСЉС‚ РЅРµ РїСЂРѕРІРµСЂСЏРІР° `/admin` РЅР°РІСЂРµРјРµ в†’ Р·Р°Р±Р°РІРµРЅРѕ РёР·РїСЉР»РЅРµРЅРёРµ, РЅРµРґРѕРІРѕР»РЅРё РєР»РёРµРЅС‚Рё, РїСЂРёС…РѕРґРЅР° Р·Р°РіСѓР±Р°. **РќРµ** РІРѕРґРё РґРѕ РґРІРѕР№РЅР° РїРѕСЂСЉС‡РєР° РёР»Рё price fraud. |
| **РњРёРЅРёРјР°Р»РЅР° РїРѕРїСЂР°РІРєР°** | РЎР»РµРґ СѓСЃРїРµС€РµРЅ RPC: Р·Р°РїРёСЃ РІ `order_notification_attempts` (order_id, channel, status, error, next_retry_at); background retry (Vercel cron РёР»Рё Supabase pg_cron) + optional webhook/alert РїСЂРё 3 РЅРµСѓСЃРїРµС…Р°. |
| **РўРµСЃС‚ Р·Р° РїСЂРёРµРјР°РЅРµ** | РЎРёРјСѓР»РёСЂР°РЅ Resend 503: РїРѕСЂСЉС‡РєР°С‚Р° РѕСЃС‚Р°РІР° РµРґРЅР° РІ DB; СЃР»РµРґ retry admin email `sent: true`; Р»РёРїСЃРІР° РґСѓР±Р»РёСЂР°РЅ insert РІ `orders`. |

**Launch blocker?** РќРµ (security). Р”Р° (operations) вЂ” Р°РєРѕ РЅСЏРјР° РїСЂРѕС†РµСЃ Р·Р° СЂСЉС‡РµРЅ РјРѕРЅРёС‚РѕСЂРёРЅРі РЅР° `/admin` РїСЂРё launch.

---

### H-02 вЂ” Econt lookup API Р±РµР· rate limiting

| | |
|---|---|
| **Р¤Р°Р№Р»/СЂРµРґ** | `app/api/shipping/econt/cities/route.ts:5вЂ“30`; `app/api/shipping/econt/offices/route.ts:8вЂ“44` |
| **Р”РѕРєР°Р·Р°С‚РµР»СЃС‚РІРѕ** | РџСѓР±Р»РёС‡РЅРё `GET` handlers Р±РµР· `check_store_checkout_rate_limit`, Р±РµР· IP cap, Р±РµР· auth. Р’СЃРµРєРё request РІРёРєР° Econt nomenclatures API СЃ server credentials вЂ” `lib/shipping/econt.ts:40вЂ“41`, `52вЂ“60`. |
| **РЎС†РµРЅР°СЂРёР№** | Р‘РѕС‚ РёР·РїСЂР°С‰Р° С…РёР»СЏРґРё Р·Р°СЏРІРєРё РєСЉРј `/api/shipping/econt/cities?q=СЃРѕ` в†’ РёР·С‡РµСЂРїРІР°РЅРµ РЅР° Econt quota, elevated latency РЅР° checkout, РїРѕС‚РµРЅС†РёР°Р»РЅР° Р±Р»РѕРєР°РґР° РЅР° API Р°РєР°СѓРЅС‚, СЂР°Р·С…РѕРґ Р·Р° bandwidth/server. |
| **РњРёРЅРёРјР°Р»РЅР° РїРѕРїСЂР°РІРєР°** | РЎРїРѕРґРµР»РµРЅ rate-limit helper (СЃСЉС‰РёСЏС‚ fingerprint RPC СЃ РѕС‚РґРµР»РµРЅ prefix, РЅР°РїСЂ. `econt-lookup`, limit 30/15min) + max `q` length (РЅР°РїСЂ. 40) Рё optional in-memory debounce per IP РЅР° route РЅРёРІРѕ. |
| **РўРµСЃС‚ Р·Р° РїСЂРёРµРјР°РЅРµ** | 31-РІР° Р·Р°СЏРІРєР° Р·Р° 1 РјРёРЅ РѕС‚ РµРґРёРЅ fingerprint в†’ HTTP 429 РёР»Рё РїСЂР°Р·РµРЅ JSON СЃ user message; 30-С‚Р°С‚Р° РјРёРЅР°РІР°; Econt mock СЃРµ РІРёРєР° в‰¤30 РїСЉС‚Рё. |

**Launch blocker?** РЈСЃР»РѕРІРµРЅ вЂ” **РґР°**, Р°РєРѕ Econt credentials СЃР° production Рё РЅСЏРјР° РІСЉРЅС€РµРЅ WAF/rate limit РЅР° Vercel. Р—Р° РјР°Р»СЉРє С‚СЂР°С„РёРє вЂ” РїСЂРёРµРјР»РёРІ СЂРёСЃРє СЃ РјРѕРЅРёС‚РѕСЂРёРЅРі.

---

## Medium / Low backlog (СЃР»РµРґ launch)

| ID | Severity | РћР±Р»Р°СЃС‚ | Р¤Р°Р№Р»/СЂРµРґ | РљРѕРЅСЃС‚Р°С‚Р°С†РёСЏ | РњРёРЅРёРјР°Р»РЅР° РїРѕРїСЂР°РІРєР° |
|----|----------|--------|----------|-------------|-------------------|
| M-01 | Medium | Email config | `lib/orders/send-order-notifications.ts:34вЂ“36` | Fallback sender `onboarding@resend.dev` Р°РєРѕ Р»РёРїСЃРІР° `ORDER_NOTIFICATION_FROM` | Fail-fast РІ `check-env.mjs` Р·Р° production; verified domain РІ Resend |
| M-02 | Medium | DEFINER hardening | `product_inventory_checkout_hardening.sql:26` | `set search_path = public` РїСЂРё `security definer` (Р·Р° СЂР°Р·Р»РёРєР° РѕС‚ `is_admin` СЃ `search_path = ''` РІ `security_hardening_phase1.sql:9`) | `set search_path = ''` + qualified names |
| M-03 | Medium | Order workflow | `app/admin/order-actions.ts:39вЂ“72` | РќСЏРјР° FSM Р·Р° status transitions (РІСЃРµРєРё РІР°Р»РёРґРµРЅ enum Рµ РїРѕР·РІРѕР»РµРЅ) | Allowed transitions map РІ server action |
| M-04 | Medium | Defense in depth | `middleware.ts:11вЂ“23` | Admin routes РЅСЏРјР°С‚ edge redirect; gate Рµ РІ RSC/actions | Optional middleware admin check |
| M-05 | Medium | Security headers | `next.config.ts:23вЂ“42` | Р›РёРїСЃРІР°С‚ `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy` | `headers()` РІ next.config РёР»Рё Vercel config |
| M-06 | Medium | Admin auth UX | `app/admin/login/actions.ts:32вЂ“34` | Supabase `signInError.message` СЃРµ РїРѕРєР°Р·РІР° РЅР° РїРѕС‚СЂРµР±РёС‚РµР»СЏ | Generic вЂћРќРµРІР°Р»РёРґРЅРё РґР°РЅРЅРёвЂњ |
| M-07 | Medium | Password reset | `app/admin/reset-password/actions.ts:48вЂ“49` | Supabase error message РІ URL РїСЂРё reset failure | Generic error message |
| M-08 | Medium | Observability | `app/checkout/actions.ts:356вЂ“363` | RPC errors СЃР°РјРѕ РІ server logs; РЅСЏРјР° Sentry | Error monitoring + alert on checkout RPC spike |
| M-09 | Medium | Econt failure UX | `checkout-delivery-fields.tsx` + econt routes | РџСЂРё 502 checkout РїСЂРѕРґСЉР»Р¶Р°РІР° СЃ manual fields (by design) | Document ops playbook |
| M-10 | Low | Quantity coercion | `app/checkout/actions.ts:314` | `quantity` РєР°С‚Рѕ string РІ JSON в†’ `0` в†’ `invalid_quantity` РІ RPC | Coerce `Number()` СЃ bounds РІ action Р·Р° РїРѕ-РґРѕР±СЉСЂ UX |
| M-11 | Low | Order reference | `lib/checkout/order-confirmation.ts` | Ref = РїСЉСЂРІРёС‚Рµ 8 hex РѕС‚ UUID (РЅРµ sequential) | РџСЂРёРµРјР»РёРІРѕ Р·Р° РјР°Р»СЉРє РѕР±РµРј; document collision probability |
| M-12 | Low | Account | `app/account/page.tsx` | РќСЏРјР° order history (placeholder) | Future feature; РЅСЏРјР° data leak |
| M-13 | Low | Rate limit secret fallback | `lib/request-fingerprint.ts:12вЂ“14` | Fallback РєСЉРј `SUPABASE_SECRET_KEY` Р°РєРѕ Р»РёРїСЃРІР° `CHECKOUT_RATE_LIMIT_SECRET` | `check-env` РІРµС‡Рµ РёР·РёСЃРєРІР° РѕС‚РґРµР»РµРЅ secret |
| M-14 | Low | CSRF | Server Actions | Next.js SameSite cookies + POST-only actions | Document reliance; no extra token |
| M-15 | Low | Product lifecycle | Hard delete | `admin_delete_product` вЂ” snapshot РІ `orders.raw_payload` РѕС†РµР»СЏРІР° | Soft delete Р·Р° audit trail РЅР° РєР°С‚Р°Р»РѕРіР° |

---

## Р”РµС‚Р°Р№Р»РµРЅ РїСЂРµРіР»РµРґ РїРѕ РѕР±Р»Р°СЃС‚Рё

### 1. Checkout Рё С†РµРЅРё

| РџСЂРѕРІРµСЂРєР° | Р РµР·СѓР»С‚Р°С‚ |
|----------|----------|
| Server-side total | **PASS** вЂ” `v_total` РѕС‚ DB С†РµРЅРё + option/promo deltas (`product_inventory_checkout_hardening.sql`) |
| Client price tampering | **PASS** вЂ” `price` РѕС‚ cart РЅРµ РІР»РёР·Р° РІ RPC payload |
| Product ID tampering | **PASS** вЂ” UUID validation РІ action (`app/checkout/actions.ts:171вЂ“178`); unknown UUID в†’ `product_not_found` |
| Sold-out / unavailable / deleted | **PASS** вЂ” `is_sold_out`, `fulfillment_type`, `FOR UPDATE` stock (`lines 175вЂ“197`) |
| Option/personalization deltas | **PASS** вЂ” server validation РІ action + RPC option helpers |
| Quantity bounds | **PASS** вЂ” RPC `1..99` (`lines 146вЂ“148`); negative/zero/malformed в†’ `invalid_quantity` / `invalid_order_item` |
| Delivery fee in total | **N/A** вЂ” COD; РґРѕСЃС‚Р°РІРєР°С‚Р° Рµ informational note, РЅРµ client-controlled line item |
| Shipping address tampering | **Bounded** вЂ” courier/type/city/office validated РІ RPC; РЅРµ РІР»РёСЏРµ РЅР° `total_price` |

### 2. РџРѕСЂСЉС‡РєРё

| РџСЂРѕРІРµСЂРєР° | Р РµР·СѓР»С‚Р°С‚ |
|----------|----------|
| Idempotency | **PASS** вЂ” UUID v4 key; duplicate returns same `order_id` |
| Concurrent duplicate submit | **PASS** вЂ” `order_request_in_progress` (`40001`) |
| Unique traceable number | **PASS** вЂ” UUID order id + `formatOrderReference` Р·Р° UI |
| Snapshot РїСЂРё delete product | **PASS** вЂ” prices/names РІ `raw_payload`; top-level `product_name`, `total_price` denormalized |
| Status transitions | **PARTIAL** вЂ” enum validation only (`order-actions.ts:44`) |
| Email failure в‰  reorder | **PASS** |
| Failed notification retry | **FAIL** вЂ” РІРёР¶ H-01 |

### 3. Authentication Рё authorization

| РџСЂРѕРІРµСЂРєР° | Р РµР·СѓР»С‚Р°С‚ |
|----------|----------|
| Admin routes/actions | **PASS** вЂ” `checkIsAdmin` РЅР° page, actions, exports |
| Non-admin authenticated | **PASS** вЂ” sign out at login (`login/actions.ts:53вЂ“55`); RLS blocks orders |
| RLS products/orders | **PASS** вЂ” admin-only writes (`admin_auth.sql`); orders select/update admin (`admin_orders_access.sql`) |
| Admin RPC | **PASS** вЂ” `assert_admin()` РІ `atomic_product_admin_functions.sql` |
| Account data isolation | **PASS** вЂ” СЃР°РјРѕ `user.email` РѕС‚ session; РЅСЏРјР° cross-user queries |
| Service role in client | **PASS** вЂ” `server-only` module |

### 4. Web security

| РџСЂРѕРІРµСЂРєР° | Р РµР·СѓР»С‚Р°С‚ |
|----------|----------|
| Server-side validation | **PASS** РЅР° checkout/admin forms |
| XSS | **LOW RISK** вЂ” JSON-LD escaped; React default escaping elsewhere |
| SQL injection | **LOW RISK** вЂ” parameterized Supabase/RPC |
| CSRF | **ACCEPTABLE** вЂ” Server Actions + session cookies |
| SSRF | **PASS** вЂ” Econt URL fixed constant (`lib/shipping/econt.ts:40вЂ“41`) |
| Open redirect | **PASS** вЂ” SEO redirects whitelist slug pattern (`middleware-redirects.ts:7вЂ“25`) |
| Rate limit checkout/login/forms | **PARTIAL** вЂ” checkout/events/subscribe rate limited; **Econt routes РЅРµ** (H-02); admin login relies on Supabase Auth |
| File upload | **PASS** вЂ” type/size/signature + bucket MIME |
| Secrets in repo | **PASS** вЂ” `.env*.local` gitignored |
| Sensitive data in errors | **MOSTLY PASS** вЂ” generic checkout messages (`mapCheckoutError`); minor leaks РЅР° admin login (M-06) |
| Security headers | **GAP** вЂ” M-05 |

### 5. Production readiness

| РџСЂРѕРІРµСЂРєР° | Р РµР·СѓР»С‚Р°С‚ |
|----------|----------|
| Resend failure | Order succeeds; email best-effort (H-01) |
| Econt failure | 502 JSON; checkout fallback manual (documented) |
| Supabase timeout/error | Checkout returns user-safe message; RPC errors logged server-side |
| Rollback/backup | Out of scope вЂ” assume Supabase backups per ops |
| Critical env vars | `scripts/check-env.mjs:24вЂ“30` вЂ” URL, anon, secret, rate limit secret, site URL; **РЅРµ** РїСЂРѕРІРµСЂСЏРІР° RESEND/ECONT |

---

## GO / NO-GO verdict

| РљСЂРёС‚РµСЂРёР№ | РЎС‚Р°С‚СѓСЃ |
|----------|--------|
| Price/inventory fraud exploitable РѕС‚ РєР»РёРµРЅС‚ | **NO-GO blocker absent** |
| Order duplication / race abuse | **NO-GO blocker absent** |
| Admin/data breach | **NO-GO blocker absent** |
| Operational notification gap | **Risk accepted** РёР»Рё fix H-01 post-launch СЃ active admin monitoring |
| Econt API abuse | **Mitigate H-02** or accept for low-traffic launch |

### **GO** Р·Р° launch (security & orders)

РЈСЃР»РѕРІРёСЏ:
1. Production env: `SUPABASE_SECRET_KEY`, `CHECKOUT_RATE_LIMIT_SECRET`, `RESEND_API_KEY`, `ORDER_NOTIFICATION_FROM` (verified domain), `ORDER_NOTIFICATION_TO`, `CRON_SECRET`, `ECONT_*` (Р°РєРѕ live lookup).
2. Launch day: СЂСЉС‡РµРЅ РјРѕРЅРёС‚РѕСЂРёРЅРі РЅР° `/admin?tab=orders` Р°РєРѕ Resend РЅРµ Рµ hardened (H-01).
3. РЎР»РµРґ launch: H-02 rate limit РЅР° Econt routes; M-01 env hardening.
4. Vercel Cron: `vercel.json` → `/api/cron/retry-order-notifications` на `0 3 * * *` (Hobby: веднъж дневно); Vercel изпраща `Authorization: Bearer ${CRON_SECRET}`.

---

## РћР±РѕР±С‰РµРЅРёРµ РЅР° Р±СЂРѕСЏС‡Рё

| Severity | Р‘СЂРѕР№ | Launch blockers |
|----------|------|-----------------|
| **Critical** | **0** | 0 |
| **High** | **2** | 0 (security); H-01 ops / H-02 conditional abuse |
| Medium | 9 | вЂ” |
| Low | 6 | вЂ” |

**Р РµР°Р»РЅРё security launch blockers: РЅСЏРјР°.**

---

*РћРґРёС‚СЉС‚ РЅРµ РїСЂРѕРјРµРЅСЏ РєРѕРґ. Р•РґРёРЅСЃС‚РІРµРЅ РЅРѕРІ Р°СЂС‚РµС„Р°РєС‚: С‚РѕР·Рё С„Р°Р№Р».*
