# READ-ONLY визуален и UI одит — VeMiDi crafts

**Дата:** 13 юни 2026  
**Режим:** Read-only (без промени по код, база, поръчки или deploy)  
**Среда:** Локален production build (`npm start` → `http://localhost:3001`)

---

## 1. Executive summary

Одитът е изпълнен **read-only** върху **локален production build**, с **192 автоматизирани browser проверки** (32 URL × 6 viewport) + ръчен преглед на ключови screenshots и код.

**Общо заключение:** Storefront-ът е **функционално стабилен и визуално зрял** за публично ползване. **Няма критични блокиращи дефекти** в основния празен поток. Открити са предимно **несъответствия в дизайн системата** (цветове на CTA, radius, тип бутони) и **средни mobile UX/accessibility проблеми** (малки touch targets в carousel и header).

| Категория | Брой |
|-----------|------|
| Критични | 0 |
| Високи | 2 |
| Средни | 11 |
| Ниски | 8 |

**Потвърдено работещо:** thank-you защита без confirmation, mobile menu (backdrop + Escape), 404, празни cart/checkout, shop филтри/сортиране/no-results, **0 horizontal overflow** при всички 192 измервания.

---

## 2. Начално състояние

| Параметър | Стойност |
|----------|----------|
| Branch | `main` |
| Commit | `d89b587` — Fix dark CTA button contrast across storefront |
| Непубликувани промени | Да — inventory + checkout одит (не са част от UI одита) |
| Browser | Chromium (Playwright headless) |
| Режим | Production build (`next start`), порт **3001** |
| Данни | Локален Supabase catalog — **7 продукта**, основно `made_to_order` |
| Screenshots | `C:\Users\velly\.cursor\projects\d-Cursor\ui-audit-screenshots\` (194 PNG + `audit-data.json`) |
| Audit tooling | `C:\Users\velly\.cursor\projects\d-Cursor\ui-audit-temp\` (извън repo) |

### Дизайн tokens (от код)

| Token | Стойности |
|-------|-----------|
| **Цветове** | `boutique-bg` #f4f1eb, `boutique-paper` #fdfcfa, `boutique-ink` #2a2824, `boutique-muted` #5e5a54, `boutique-accent` #8a6748, `boutique-sage-deep` #4d5c4a, `boutique-rose-deep` #4d5c4a |
| **Шрифтове** | Body: Inter (+ cyrillic); Headings: Playfair Display (`.font-heading`) |
| **Container** | `PageContainer`: `max-w-6xl px-5 sm:px-8`; Header: `max-w-[90rem]` |
| **Shadows** | `--shadow-boutique`, `--shadow-boutique-sm` |
| **Focus** | Global `outline: 2px solid boutique-accent` (+ изключения с `boutique-rose-deep`) |
| **Breakpoints** | Tailwind: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 |

### Прегледани изходни файлове

- `app/globals.css`
- `app/layout.tsx`
- `components/layout/*` (header, footer, page-container, mobile-nav, site-shell)
- `components/product/*` (product-card, product-card-media, product-detail-gallery, product-detail-add-to-cart)
- `components/cart/*`, `components/checkout/*`
- `app/shop/page.tsx`, `app/thank-you/page.tsx`, `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`

---

## 3. Покрити URL и viewports

### Viewports (всички тествани)

360×800, 390×844, 768×1024, 1024×768, 1440×900, 1920×1080

### URL (32)

| Група | URL |
|-------|-----|
| Основни | `/`, `/shop`, `/categories`, `/occasions` |
| Shop варианти | `?q=test`, `?sort=price-asc`, `?sort=price-desc`, `?sort=name-asc`, `?promotions=only`, `?personalization=only`, `?price=under-20`, `?q=zzzz-no-results-xyz` |
| Пазарен поток | `/cart`, `/checkout` |
| Информация | `/about`, `/contact`, `/delivery`, `/returns`, `/privacy`, `/terms`, `/cookies` |
| Съдържание | `/blog`, `/blog/blog-tvorcheski-komplekti`, `/events`, `/events/event-textil` |
| Auth / специални | `/login`, `/thank-you`, `/this-page-does-not-exist-audit` (404) |
| Продукти | `/products/plik-za-pari-copy-2`, `/products/plik-za-pari-za-momicheta`, `/products/plik-za-pari-mladozhentsi`, `/products/tvorcheski-komplekt-valshebni-peperudi` |

### Horizontal overflow

**0 случая** — `document.documentElement.scrollWidth === clientWidth` навсякъде (192/192 проверки).

---

## 4. Непроверени сценарии

| Сценарий | Причина |
|----------|---------|
| `/cart` с 1+ продукта | Не е безопасно mock-нато с валиден UUID без промяна на данни |
| `/checkout` с формуляр + Econt lookup | Изисква cart state + API; без реална поръчка |
| Add-to-cart toast | Не е trigger-нат (без submit) |
| `stocked` / `unavailable` / `is_sold_out` визуално | Каталогът показва основно `made_to_order` |
| Продукт без изображение | Няма такъв в live catalog |
| Комбинирани shop филтри (3+) | Само единични филтри |
| Cart badge 1 / 9 / 99 | Не е симулиран |
| Global `loading.tsx` | Трудно без throttling в prod build |
| Global `error.tsx` | Не е симулиран безопасно |
| Econt fallback UI | Изисква API failure |
| Newsletter submit | Няма форма в footer; форми на blog/events не са submit-нати |
| Keyboard tab order (пълен) | Само частично (focus pattern от код) |
| Admin UI | Извън обхват на публичния одит |

---

## 5. Критични дефекти

**Няма.**

---

## 6. Високи дефекти

### UI-H-01 — Непоследователни primary CTA в shopping flow

| Поле | Стойност |
|------|----------|
| **ID** | UI-H-01 |
| **Сериозност** | Висока |
| **URL** | `/cart` → `/checkout` vs `/shop` / product detail |
| **Viewport** | 390×844, 1920×1080 |
| **Компонент/файл** | `components/cart/cart-panel.tsx`, `components/checkout/checkout-panel.tsx`, `components/product/product-detail-add-to-cart.tsx`, `app/shop/page.tsx` |
| **Очаквано** | Един primary CTA стил в целия поток |
| **Реално** | Cart CTA: `rounded-xl` + `bg-boutique-sage-deep`; Empty states / product cards: `rounded-full` + `bg-boutique-ink`; Shop: `boutique-sage-deep` |
| **Стъпки** | 1. Отвори `/cart` празна → „Към продуктите“ (ink/pill). 2. Сравни с cart summary „Към плащане“ (sage/rounded-xl). 3. Сравни с product „Добави в количката“. |
| **Влияние** | Потребителят не разпознава едно „основно действие“ в потока |
| **Корекция** | Един token `--cta-primary` (цвят + radius + padding) за целия storefront |
| **Сложност** | M |
| **Screenshot** | `390x844__-cart.png`, `390x844__-products-tvorcheski-komplekt-valshebni-peperudi.png` |

### UI-H-02 — Carousel контроли под минималния touch target на mobile

| Поле | Стойност |
|------|----------|
| **ID** | UI-H-02 |
| **Сериозност** | Висока |
| **URL** | `/shop`, `/` (product cards) |
| **Viewport** | 360×800, 390×844 |
| **Компонент/файл** | `components/product/product-card-media.tsx` |
| **Очаквано** | Touch targets ≥ 44×44 px |
| **Реално** | Стрелки `h-7 w-7` (28px); dots `h-1` / `w-1` (4–14px) |
| **Стъпки** | 1. Отвори `/shop` на 360px. 2. Намери продукт с няколко снимки. 3. Опитай tap на dot/стрелка. |
| **Влияние** | Трудно превключване на снимки на телефон |
| **Корекция** | По-големи hit areas (min 44px), dots с padding wrapper |
| **Сложност** | S |
| **Screenshot** | `360x800__-shop.png` |

---

## 7. Средни дефекти

### UI-M-01 — Header action бутони 40×40 px

| Поле | Стойност |
|------|----------|
| **ID** | UI-M-01 |
| **Сериозност** | Средна |
| **URL** | Всички публични страници |
| **Viewport** | 360×800, 390×844 |
| **Файл** | `components/layout/header-actions.tsx`, `components/layout/mobile-nav.tsx` |
| **Очаквано** | ≥ 44×44 px touch target |
| **Реално** | Search/cart/menu: `h-10 w-10` (40px) |
| **Корекция** | `h-11 w-11` или invisible padding wrapper |
| **Сложност** | XS |
| **Screenshot** | `390x844__-checkout.png` |

### UI-M-02 — Три различни „primary green“ в публичния UI

| Поле | Стойност |
|------|----------|
| **ID** | UI-M-02 |
| **Сериозност** | Средна |
| **URL** | `/`, `/shop`, `/blog`, `/events`, `/categories` |
| **Файлове** | `app/page.tsx`, `app/shop/page.tsx`, `app/blog/page.tsx`, `app/events/page.tsx`, `app/categories/page.tsx` |
| **Очаквано** | Един primary accent |
| **Реално** | `boutique-sage-deep`, `boutique-rose-deep`, `boutique-ink` се редуват |
| **Корекция** | Един `--color-cta-primary` token |
| **Сложност** | M |
| **Screenshot** | `1920x1080__-shop.png` |

### UI-M-03 — Radius несъответствие

| Поле | Стойност |
|------|----------|
| **ID** | UI-M-03 |
| **Сериозност** | Средна |
| **Очаквано** | Един radius scale |
| **Реално** | `rounded-full` (CTA empty), `rounded-xl` (cart/checkout/forms), `rounded-lg` (shop filters), `rounded-2xl/3xl` (cards) |
| **Корекция** | Формализирай radius scale в `@theme` |
| **Сложност** | M |

### UI-M-04 — Shop mobile: „Готово“ до sort dropdown

| Поле | Стойност |
|------|----------|
| **ID** | UI-M-04 |
| **Сериозност** | Средна |
| **URL** | `/shop` |
| **Viewport** | 360×800 |
| **Очаквано** | Sort control като единна група |
| **Реално** | „Готово“ бутон визуално отделен от dropdown |
| **Корекция** | Inline sort без отделен submit или flex group |
| **Сложност** | S |
| **Screenshot** | `360x800__-shop.png` |

### UI-M-05 — Product detail: много вертикално съдържание преди CTA

| Поле | Стойност |
|------|----------|
| **ID** | UI-M-05 |
| **Сериозност** | Средна |
| **URL** | `/products/tvorcheski-komplekt-valshebni-peperudi` |
| **Viewport** | 390×844 |
| **Очаквано** | CTA видим без много scroll |
| **Реално** | Дълги option groups + info cards преди „Добави в количката“ |
| **Корекция** | Sticky mobile CTA bar или collapsible sections |
| **Сложност** | M |
| **Screenshot** | `390x844__-products-tvorcheski-komplekt-valshebni-peperudi.png` |

### UI-M-06 — Focus ring: два стандарта

| Поле | Стойност |
|------|----------|
| **ID** | UI-M-06 |
| **Сериозност** | Средна |
| **Файлове** | `app/globals.css`, `components/layout/header.tsx`, `components/layout/mobile-nav.tsx` |
| **Очаквано** | Един focus-visible цвят |
| **Реално** | Global: `boutique-accent`; nav: `boutique-rose-deep` |
| **Корекция** | Унифицирай към `boutique-accent` |
| **Сложност** | XS |

### UI-M-07 — Catalog card CTA е text link, не бутон

| Поле | Стойност |
|------|----------|
| **ID** | UI-M-07 |
| **Сериозност** | Средна |
| **URL** | `/shop` |
| **Файл** | `components/product/product-card.tsx` (compact variant) |
| **Очаквано** | Достатъчен tap area за primary action |
| **Реално** | „Избери опции →“ text link с по-малък hit area |
| **Корекция** | Min-height 44px или pill button |
| **Сложност** | S |
| **Screenshot** | `360x800__-shop.png` |

### UI-M-08 — Sticky header без компенсация на anchor scroll

| Поле | Стойност |
|------|----------|
| **ID** | UI-M-08 |
| **Сериозност** | Средна |
| **Файл** | `components/layout/header.tsx` |
| **Очаквано** | Anchor targets не се скриват под header |
| **Реално** | `sticky top-0 z-50` — не е тествано на всички страници |
| **Корекция** | `scroll-margin-top` на anchor секции |
| **Сложност** | S |

### UI-M-09 — Logo `scale-[1.65]` в header

| Поле | Стойност |
|------|----------|
| **ID** | UI-M-09 |
| **Сериозност** | Средна |
| **Файл** | `components/layout/header.tsx` |
| **Очаквано** | Стабилен header layout |
| **Реално** | CSS scale увеличава визуалния размер; hover `scale-[1.72]` |
| **Корекция** | По-голям container вместо transform scale |
| **Сложност** | S |
| **Screenshot** | `390x844__mobile-menu-open.png` |

### UI-M-10 — Tablet landscape shop sidebar

| Поле | Стойност |
|------|----------|
| **ID** | UI-M-10 |
| **Сериозност** | Средна |
| **URL** | `/shop` |
| **Viewport** | 1024×768 |
| **Очаквано** | Балансиран filter/grid layout |
| **Реално** | Sidebar филтри заемат много вертикално пространство |
| **Корекция** | Collapsible filter panel на tablet |
| **Сложност** | M |

### UI-M-11 — Checkout empty: голям hero преди картата

| Поле | Стойност |
|------|----------|
| **ID** | UI-M-11 |
| **Сериозност** | Средна |
| **URL** | `/checkout` (празен) |
| **Viewport** | 390×844 |
| **Очаквано** | Бърз достъп до empty state action |
| **Реално** | Hero + описание + card + дълъг footer = много scroll |
| **Корекция** | По-компактен hero на empty checkout |
| **Сложност** | S |
| **Screenshot** | `390x844__-checkout.png` |

---

## 8. Ниски дефекти

| ID | Описание | Файл/зона | Сложност |
|----|----------|-----------|----------|
| UI-L-01 | Tagline скрит под 390px (`min-[390px]:block`) — на 360px header е по-компактен | `header.tsx` | XS |
| UI-L-02 | Footer social icons ~32px — под 44px guideline | `social-links.tsx` | XS |
| UI-L-03 | Product card hover lift (`-translate-y-1`) — няма на touch | `product-card.tsx` | XS |
| UI-L-04 | Mixed uppercase tracking (`0.18em` / `0.22em` / `0.24em`) | Множество | XS |
| UI-L-05 | Shop „Изчисти“ като link + button — дублиране | `shop/page.tsx` | XS |
| UI-L-06 | Blog/events CTA `rounded-lg` vs storefront `rounded-full` | `blog/page.tsx`, `events/page.tsx` | S |
| UI-L-07 | Cart quantity input `w-10` (40px) — граничен touch target | `cart-panel.tsx` | XS |
| UI-L-08 | Copyright година динамична — OK по код, визуално различни в screenshots | `footer.tsx` | — |

---

## 9. Несъответствия по компоненти

| Компонент | Проблем |
|-----------|---------|
| **Primary CTA** | `ink` pill / `sage-deep` rounded-xl / `rose-deep` rounded-lg |
| **Product card** | default `rounded-3xl` + full button vs catalog `rounded-xl` + text link |
| **Forms** | `rounded-xl` inputs в checkout; `rounded-lg` buttons в shop |
| **Hero eyebrow** | `boutique-accent` uppercase — OK, но различен tracking на страници |
| **Status colors** | Error: `red-600/200`; success: sage; warning: amber (Econt) — не унифицирани като tokens |
| **Page hero** | `VisualPageHero` на cart/checkout/about; липсва на product detail |

---

## 10. Responsive проблеми по viewport

| Viewport | Наблюдения |
|----------|------------|
| **360×800** | 2-col product grid — тесни карти; carousel controls твърде малки; **без overflow** |
| **390×844** | Най-добър mobile reference; thank-you OK; menu drawer OK |
| **768×1024** | Secondary nav bar под header (`md:block xl:hidden`) — допълнителен ред |
| **1024×768** | Shop sidebar + grid — плътен layout |
| **1440×900** | Container `max-w-6xl` — широки странични полета |
| **1920×1080** | Същото — hero и footer с много whitespace (умишлено boutique) |

---

## 11. Accessibility и keyboard

| Наблюдение | Статус |
|------------|--------|
| Skip link | ✅ `site-shell.tsx` — „Към съдържанието“ |
| `aria-label` на icon buttons | ✅ search, cart, menu, gallery |
| Mobile menu Escape + scroll lock | ✅ `mobile-nav.tsx` |
| `prefers-reduced-motion` | ✅ `globals.css` |
| Global `focus-visible` | ✅ |
| Carousel dots 4px | ❌ UI-H-02 |
| Thank-you без false success | ✅ heading „Няма активно потвърждение“ |
| 404 | ✅ ясни CTAs |
| Пълен tab order audit | ⚠️ Непроверен |

---

## 12. Предложена дизайн система

### Цветови tokens

```css
--color-text-primary: boutique-ink;      /* #2a2824 */
--color-text-muted: boutique-muted;      /* #5e5a54 */
--color-surface-page: boutique-bg;       /* #f4f1eb */
--color-surface-card: boutique-paper;    /* #fdfcfa */
--color-border: boutique-line;           /* #e4ddd4 */
--color-cta-primary: boutique-sage-deep;   /* #4d5c4a — един primary */
--color-cta-primary-hover: boutique-ink;
--color-cta-secondary: transparent + border boutique-line;
--color-status-error: red-600;
--color-status-warning: amber-50 / amber-900;
```

**Намерено несъответствие:** 3 различни primary (`ink`, `sage-deep`, `rose-deep`) в 12+ файла.

### Typography scale

```
eyebrow:     text-xs uppercase tracking-[0.2em] font-semibold text-boutique-accent
h1 page:     font-heading text-4xl sm:text-5xl text-boutique-ink
h2 section:  font-heading text-2xl text-boutique-ink
body:        text-sm leading-relaxed text-boutique-muted
price-lg:    font-heading text-2xl
price-md:    font-heading text-lg text-boutique-sage-deep
```

**Несъответствие:** product title `text-sm` в catalog vs `text-xl` на card default.

### Spacing scale

```
section-y:   py-16 md:py-24
card-p:      p-6 md:p-8
grid-gap:    gap-6 lg:gap-8
container:   max-w-6xl px-5 sm:px-8
header-pad:  py-3.5
```

### Radius scale

```
radius-sm:   rounded-lg    /* filters, small buttons */
radius-md:   rounded-xl    /* inputs, cards mobile */
radius-lg:   rounded-2xl   /* panels */
radius-xl:   rounded-3xl   /* feature cards */
radius-pill: rounded-full  /* primary CTA — избери ЕДИН стил за CTA */
```

### Breakpoints

```
sm:  640px   — 2-col shop grid
md:  768px   — secondary nav, tablet layouts
lg:  1024px  — shop sidebar
xl:  1280px  — desktop nav
2xl: 1536px  — social in header
```

### Button variants

| Variant | Клас |
|---------|------|
| primary | `rounded-xl bg-boutique-sage-deep text-white min-h-11 px-6 font-semibold hover:bg-boutique-ink` |
| secondary | `rounded-xl border border-boutique-line text-boutique-ink min-h-11 px-6 hover:border-boutique-accent` |
| ghost/link | `text-boutique-sage-deep underline-offset-4 hover:underline` (само catalog secondary) |
| destructive | `bg-red-600 text-white` (admin/error only) |

### Form controls

Един shared `fieldClass`:

```
mt-2 w-full rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 text-sm
focus:border-boutique-accent/50 focus:ring-2 focus:ring-boutique-accent/10
```

В момента дублиран в `checkout-delivery-fields.tsx`, `checkout-panel.tsx` и др.

### Status colors

| State | Token |
|-------|-------|
| error | `border-red-200 bg-red-50 text-red-700` |
| warning | `border-amber-200 bg-amber-50 text-amber-900` |
| success | `text-boutique-sage-deep` |
| disabled | `opacity-60 cursor-not-allowed` |

### Card anatomy

```
Product card (listing):
  - media: aspect 4/5 (default) | 5/6 compact sm:square
  - padding: p-6 sm:p-7 (default) | p-3 sm:p-5 (compact)
  - title: line-clamp-2 (compact) | text-xl (default)
  - footer: price + CTA / availability label
  - border: border-boutique-line/70
  - shadow: shadow-boutique-sm (compact) | custom (default)
```

### Image aspect ratios

| Контекст | Ratio |
|----------|-------|
| Product listing | 4/5 |
| Product listing compact | 5/6 → sm:square |
| Product detail gallery | 4/5 |
| Thumbnails | h-24 w-20 sm:h-28 sm:w-24 |
| Hero banners | full-width, variable height |

### Page hero pattern

```
eyebrow (uppercase accent) → h1 (font-heading) → description → optional CTA
VisualPageHero: used on shop, cart, checkout, about, categories
Product detail: inline back link, no shared hero
```

### Section spacing

```
Between major sections: space-y-8 (checkout) | py-16 md:py-24 (pages)
Between cards in grid: gap-6 lg:gap-8
```

### Z-index layers

```
skip-link:     z-[100]
mobile menu:   z-[70]
sticky header: z-50
modals/toast:  z-50+
carousel nav:  z-10
```

### Motion

```
UI transitions:    duration-200
Card hover:        duration-500 ease-out
Reduced motion:    0.01ms (globals.css)
```

### Focus-visible standard

```
outline: 2px solid var(--color-boutique-accent);
outline-offset: 3px;
```

### Loading / empty / error patterns

| Pattern | Компонент |
|---------|-----------|
| Loading | `app/loading.tsx` — skeleton pulse |
| Empty cart/checkout | centered card + CTA |
| 404 | `app/not-found.tsx` — card + 2 CTAs |
| Error | `app/error.tsx` — red accent + retry |
| No shop results | inline message в shop grid |
| Thank-you invalid | neutral message, no false success |

---

## 13. Приоритетен план

### Преди Preview

1. **UI-H-01** — унифицирай CTA в cart / checkout / product / shop
2. **UI-H-02** — carousel touch targets (стрелки + dots)
3. **UI-M-01** — header icons → 44px

### Преди production

4. **UI-M-02 / UI-M-03** — design tokens в Tailwind `@theme`
5. **UI-M-06** — един focus color
6. **UI-M-05** — sticky mobile CTA на product detail (по избор)

### След launch

7. **UI-M-04, UI-M-10** — shop filter UX polish
8. **UI-L-*** — spacing / tracking polish
9. Пълен keyboard / tab order audit
10. Визуални states за stocked / sold_out / unavailable (когато има данни в каталога)

---

## 14. Screenshot index

Пълен архив: **194 PNG** + `audit-data.json`  
Път: `C:\Users\velly\.cursor\projects\d-Cursor\ui-audit-screenshots\`

| ID | Файл | URL | Viewport | Дефект |
|----|------|-----|----------|--------|
| S-01 | `360x800__-shop.png` | /shop | 360×800 | UI-H-02, UI-M-04, UI-M-07 |
| S-02 | `1920x1080__-shop.png` | /shop | 1920×1080 | UI-M-02 |
| S-03 | `390x844__-cart.png` | /cart (празна) | 390×844 | UI-H-01 |
| S-04 | `390x844__-checkout.png` | /checkout (празен) | 390×844 | UI-M-01, UI-M-11 |
| S-05 | `390x844__-products-tvorcheski-komplekt-valshebni-peperudi.png` | product detail | 390×844 | UI-H-01, UI-M-05 |
| S-06 | `390x844__thank-you-no-confirmation.png` | /thank-you | 390×844 | ✅ защита OK |
| S-07 | `390x844__mobile-menu-open.png` | / (menu open) | 390×844 | UI-M-09 |
| S-08 | `390x844__-this-page-does-not-exist-audit.png` | 404 | 390×844 | ✅ OK |
| S-09 | `768x1024__-checkout.png` | /checkout | 768×1024 | UI-M-11 |
| S-10 | `1024x768__-shop.png` | /shop | 1024×768 | UI-M-10 |
| S-11 | `1440x900__-thank-you.png` | /thank-you | 1440×900 | ✅ защита OK |
| S-12 | `1920x1080__-.png` | / (home) | 1920×1080 | reference |

---

## 15. Потвърждение

| Действие | Статус |
|----------|--------|
| Редактирани файлове в приложението (за одита) | **Няма** |
| Промени в базата | **Няма** |
| Реални поръчки / имейли | **Няма** |
| Commit / push / PR / deploy | **Няма** |
| Production като тест среда | **Не** — само `localhost:3001` |

---

*Този документ е read-only одит. Корекциите не са имплементирани в този етап.*
