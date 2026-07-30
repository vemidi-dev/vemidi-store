# Продуктова система

## Публикация и видимост

| Поле | Стойности | Ефект |
|------|-----------|--------|
| `status` | `draft` \| `published` \| `archived` | Само `published` е storefront-published |
| `visibility` | `public` \| `upsell_only` | `upsell_only` — извън каталог, за upsell |
| `is_sold_out` | bool | Видим, но не orderable (според UI/helpers) |

Admin preview позволява преглед на draft извън публичния сайт.

## Fulfillment / inventory

`fulfillment_type`:

- `made_to_order` — по поръчка
- `stocked` — със `stock_quantity` / max cart quantity; checkout RPC намалява stock атомарно
- `unavailable` — не може да се поръча

**За проверка:** освобождаване на stock при cancel — в SQL коментари е отбелязано като неимплементирано.

## Опции (universal product options)

- Groups + values: single / multiple / text / textarea / date.
- Pricing mode delta; conditional groups (`dependsOn`).
- Option value images.
- Option value → `material_id` (материална библиотека; не променя checkout логиката директно според SQL коментар).
- Валидация на storefront + campaign handoff.

Material-stock layout: при stocked + quantity selector или material-linked options UI ползва card layout; на desktop цветовете могат да са в лявата колона, на mobile — до опциите.

## Quantity price tiers

- JSON tiers на продукта (`minQuantity` / `maxQuantity` / `unitPrice`).
- PDP показва таблица „Отстъпки за количества“.
- Cart и prepared-variants summary групират quantity по **purchasable variant**:
  - един и същ product + size/material options (+ personalization delta);
  - **различен цвят НЕ разделя** групата;
  - **различен материал/размер разделя** групата.

Ключови файлове: `product-quantity-pricing.ts`, `quantity-tier-group.ts`, `product-prepared-variants.ts`.

## Цветове

- Color fields от palette и/или quantity mode (`choice` | `quantity`).
- Отделни cart lines при различен цвят (line id включва цвят), но tier grouping игнорира цвета.

## Персонализация и wishes

- Structured personalization fields (text/textarea, required/optional toggle, priceDelta).
- Wish templates по occasion; product assignments.
- `personalization_open_by_default` — дали акордеонът е отворен (с layout-aware default).

## Ready product CTA

Когато е включен: линк/карта към готов свързан продукт (label + product id; fallback към related — според `product-ready-cta.ts`).

## Upsells

- Admin-дефинирани оферти към друг продукт (special price, max qty, section title).
- Могат да ползват `upsell_only` продукти.
- API: `/api/cart-upsells` (ако се ползва от UI).

## Merchandising

- Related products на PDP.
- Featured + home sort order.
- Card badge.
- Promotion campaigns (отделно от coupons).

## Page content / SEO

- Heading subtitle, subtitle, multi-section content.
- Product SEO meta/OG.
- Service blocks / copy labels (напр. „Цена за този продукт“ за stock layout).

## Ценообразуване (опростено)

```
tierBase(product.price, quantity) + optionDelta + personalizationDelta
```

UI може да подаде `unitPriceOverride` при add-to-cart, за да запази показаната цена; cart пази `baseUnitPrice` / deltas / tiers за преизчисление при qty change.

## Рискове

- Грешни tiers / deltas → несъответствие PDP vs cart (има regression тестове).
- Stocked без реален stock → блокиране или oversell edge cases.
- `upsell_only` / draft публикувани „наполовина“ → объркване в каталога.
