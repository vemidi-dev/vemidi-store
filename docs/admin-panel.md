# Админ панел — функционална документация

Източник: `app/admin/`, `components/admin/`, `lib/admin/`.  
Админът е една основна страница `/admin` със секции през `?tab=…`. Няма отделен tab „Settings“ — публичните текстове/герои са в **Текстове** (`content`).

## Достъп и маршрути

| Път | Назначение |
|-----|------------|
| `/admin` | Основен панел |
| `/admin/login` | Вход |
| `/admin/reset-password` | Заявка за нова парола |
| `/admin/update-password` | Задаване на нова парола |
| `/admin/products/[id]/preview` | Admin-only preview на продукт (`noindex`) |
| `/admin/orders/export` | CSV експорт на поръчки |
| `/admin/subscribers/export` | CSV експорт на абонати |

Auth: Supabase session + проверка в `admin_users` чрез `checkIsAdmin`. Middleware обновява сесията за `/admin/:path*`, но admin gate е в самите admin страници.

### Табове (`AdminTab`)

**Продажби:** `orders`, `withdrawals`  
**Съдържание:** `products` (default), `categories`, `colors`, `materials`, `promotions`, `blog`, `events`, `wishes`, `faq`, `subscribers`, `content`

---

## 1. Продукти (`products`)

**UI:** `ProductCreatePanel`, `ProductListPanel`  
**Actions:** `app/admin/actions.ts` (+ landing `landing-page-actions.ts`)

### Какво се управлява

- Основни данни: име, цена, slug, SEO meta/OG.
- Съдържание на PDP: heading subtitle, subtitle, description, персонализационна информация, размери/материали, поръчка, допълнителна информация.
- Галерия: upload / replace / reorder / primary / alt / delete.
- Категории: product / occasion / material + primary category.
- Visibility: `public` | `upsell_only`.
- Publication: `draft` | `published` | `archived`.
- Fulfillment: `made_to_order` | `stocked` | `unavailable` + stock quantity.
- `is_sold_out`, quantity selector, quantity price tiers.
- Опции (универсални option groups), връзка option value → material.
- Цветови полета (palette / quantity mode).
- Персонализация + wish templates.
- FAQ прикачвания.
- Merchandising: featured, home sort, related products, ready-product CTA.
- Upsell оферти + заглавие на секцията.
- Landing pages към продукта.
- Duplicate, delete, preview, publish shortcut.

### Publish validation (кодово)

Публикуване изисква: име, валиден slug, цена, ≥1 категория, primary category, ≥1 изображение, subtitle (`product-publish-validation.ts`).

### Влияние върху публичния сайт

| Настройка | Ефект |
|-----------|--------|
| `published` + `public` | Видим в каталог/PDP |
| `upsell_only` | Скрит от каталог; ползва се като upsell |
| `draft` / `archived` | Не е storefront-published |
| `stocked` + stock | Checkout намалява наличност |
| Опции / deltas / tiers | Цена в PDP, cart, checkout |
| Ready CTA / related | Блокове на PDP |
| Landing pages | Campaign URL-и (отделен host) |

### Рискове при грешна настройка

- Грешна primary category → грешни breadcrumbs/SEO.
- `upsell_only` по невнимание → продуктът „изчезва“ от магазина.
- Грешни option deltas / material links → грешни цени в количката.
- Quantity tiers / stock без реална наличност → oversell или блокиран checkout (**за проверка:** всички edge cases на RPC).
- Липсващи изображения / лош slug → publish блокове или слаби PDP.
- Landing slug конфликт / неактивна landing (**за проверка:** пълен production flow с butterfly-landing).

---

## 2. Категории (`categories`)

**UI:** category management panel/view  
**Филтър:** `?categoryType=product|occasion|material`

### Полета

Име, slug, тип, parent (за product/material), card description, card/cover images + alts, `is_visible`, `show_on_home`, съдържание/SEO (hero description, listing heading, intro, seo body, meta/og, robots_index), related categories, reorder.

### Влияние

- Хъбове `/categorii`, `/povodi`, `/zagotovki-i-materiali`.
- Home блокове (`show_on_home`).
- Присвояване към продукти.
- Related categories discovery на категория.

### Рискове

- Скрита категория (`is_visible=false`) изчезва от storefront филтри.
- Смяна на slug чупи стари URL (освен ако има redirect логика — **за проверка** за категории).
- Грешен тип (product vs occasion vs material) размества навигацията.
- Related към неподходящи/скрити категории → слаб UX.

---

## 3. Цветове (`colors`)

**UI:** color management  
**Таблици:** `color_groups`, `color_options`  
**SQL зависимост:** `color_palette_management.sql` (ако липсва, load може да fail-не с послание)

### Полета

Group label; option name, hex, sort, `is_active`; move/delete.

### Влияние

Цветовите селектори на PDP (когато продуктът ползва palette/color fields).

### Рискове

- Изтриване на група, която се ползва от продукти.
- Деактивиран цвят, все още закачен към продукт (**за проверка:** дали PDP филтрира inactive).
- Невалиден hex → визуален бъг.

---

## 4. Материали (`materials`)

**UI:** material management  
**Таблица:** `product_materials`

Библиотека от материали (име, описание, изображение, active, sort), връзвани към option values.

### Влияние

Визуална/информационна връзка в option UI; **не е** отделна checkout логика според SQL коментарите за `material_id`.

### Рискове

- Изтрит/inactive материал, все още линкнат към option value.
- Объркване с category type `material` (това е категорийн хъб, не същата таблица).

---

## 5. Промоции (`promotions`)

Включва **кампании** и **купони**.

### Кампании

Име, %, период starts/ends, active, multi-select продукти; update/duplicate/delete/activate.

### Купони

Код, %, expires_at, active; връзка към used order при употреба.

### Legacy

Стари per-product `product_promotions` без `campaign_id` може все още да се редактират, ако съществуват.

### Влияние

Отстъпки в каталог/PDP цена и/или checkout купон.

### Рискове

- Припокриващи се кампании — правилото за приоритет е **за проверка**.
- Твърде висок % / грешен продуктов сет.
- „Active“ купон с минала expiry (**за проверка:** enforcement).

---

## 6. Блог (`blog`)

- Blog categories: име, slug, description, sort, active.
- Posts: title, slug, excerpt, rich content (вкл. inline images), category, author, read_minutes, featured/popular, CTA label + category, related products, cover image, draft/publish.

Подробности: [blog-system.md](./blog-system.md).

### Рискове

- Публикуване с лош slug/CTA към грешна категория.
- Featured/popular spam.
- Cover vs inline image объркване.

---

## 7. Събития (`events`)

- Event CRUD: заглавие, slug, съдържание, тип/аудитория/формат, цена, капацитет, места, възраст, адрес, продължителност, водещ, includes/materials/cancellation, registration URL, локация, дати, cover, published.
- Gallery: upload, alt, publish/hidden, reorder, delete.
- Registrations: статуси `new` | `confirmed` | `cancelled`.

### Рискове

- Published с 0 места / capacity < available_spots.
- Грешни дати.
- Дали `available_spots` се намалява автоматично при регистрация — **за проверка**.
- Registration status vs реални места — **за проверка**.

---

## 8. Пожелания (`wishes`)

Create: body + occasion category IDs; title ≈ първите 80 символа; `is_active=true`.  
List + delete. **Edit/update UI не е намерен** (само create/delete).

### Влияние

Wish picker на PDP, когато personalization field позволява wishes и продуктът има линкове.

### Рискове

- Delete на wish, все още закачен към продукти (**за проверка**).
- Без occasions → create fail.

---

## 9. FAQ (`faq`)

Филтър `faq_scope=global|product`.  
Groups + items (question/answer, active, sort); attach към продукти.

### Рискове

- Inactive item/group все още attach-нат.
- Product-scope group без прикачване към продукт → не се вижда.

---

## 10. Абонаменти (`subscribers`)

Списък `newsletter_subscribers`: search, topic (`blog`|`products`|`events`), status; update active/topics; CSV export.

### Влияние върху browsing

Няма. Само маркетинг/операции.  
**Пълен send pipeline от admin UI не е намерен** — **за проверка**.

### Рискове

PII при експорт; деактивиране на грешен абонат.

---

## 11. Текстове (`content`)

Две зони:

1. **Съдържание на сайта** — ключове от `site_content` (home, shop, cart, checkout, legal, product copy defaults, …).
2. **Изображения на сайта** — hero ключове: `home.hero`, `home.atelier`, `shop.hero`, `categories.hero`, `occasions.hero`, `blog.hero`, `events.hero`, `about.hero`, `checkout.thank_you`.

### Влияние

Почти всички публични текстове и херо изображения.

### Рискове

- Изтрит/празен legal или business текст.
- Clear media → fallback asset.
- Редакция на ключ извън defaults — **за проверка** как се рендерира.

---

## 12. Поръчки (`orders`)

Филтри: status, search, order_id, source (store/landing/unknown), dates, payment, delivery, sort, pagination.  
Статуси: `new`, `confirmed`, `making`, `shipped`, `completed`, `cancelled`.  
Детайли, notification summaries, delete, CSV export.

### Рискове

- Cancel/delete без оперативна синхронизация.
- Статус ≠ реално изпълнение.
- PII в експорт.

---

## 13. Отказ от договор (`withdrawals`)

Опашка от публичната withdrawal форма.  
Статуси: `new`, `reviewing`, `accepted`, `rejected`, `completed`.

### Рискове

Грешен accept/reject (правен/оперативен риск).

---

## Карта на server actions (ориентир)

| Файл | Област |
|------|--------|
| `actions.ts` | продукти, галерия, категории |
| `material-actions.ts` | материали |
| `color-actions.ts` | цветове |
| `promotion-actions.ts` / `coupon-actions.ts` | промоции/купони |
| `content-actions.ts` | блог + събития |
| `blog-category-actions.ts` / `blog-inline-image-actions.ts` | блог |
| `event-gallery-actions.ts` / `event-registration-actions.ts` | събития |
| `wish-actions.ts` / `faq-actions.ts` | wishes / FAQ |
| `site-content-actions.ts` / `site-media-actions.ts` | текстове/медиа |
| `order-actions.ts` / `withdrawal-actions.ts` / `subscriber-actions.ts` | ops |
| `landing-page-actions.ts` | product landings |

## Какво липсва / за проверка

- Отделен Settings tab — **няма**.
- Wish edit — **не е намерен**.
- Newsletter send от admin — **не е намерен**.
- Точни правила за stacking на кампании + купони.
- Inactive colors/materials филтриране на PDP.
- Event spots auto-decrement.
