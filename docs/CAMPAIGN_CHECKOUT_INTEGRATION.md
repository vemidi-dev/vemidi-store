# Campaign checkout integration

Landing страниците и кампанийните поддомейни **не** поддържат собствен checkout. Всички поръчки минават през магазина на `https://vemidi-crafts.com`.

## Препоръчана домейн структура

| Роля | Домейн |
|------|--------|
| Магазин + checkout | `https://vemidi-crafts.com` |
| Специални продуктови страници | `https://special.vemidi-crafts.com/{product-page}` |
| Handoff вход | `https://vemidi-crafts.com/campaign-checkout` |

## Каноничен URL формат

```
https://vemidi-crafts.com/campaign-checkout?product={PRODUCT_UUID}&campaign={CAMPAIGN_SLUG}&quantity=1
```

### Задължителни параметри

| Параметър | Описание |
|-----------|----------|
| `product` | UUID на продукта в Supabase (`products.id`) |

### Препоръчителни параметри

| Параметър | Описание |
|-----------|----------|
| `campaign` | Slug на кампанията (напр. `butterflies-summer`) |
| `source` | Нормализиран източник (напр. `campaign-butterflies`). Ако липсва, се извежда от `campaign`. |
| `landing` | HTTPS URL само към одобрени домейни (`special.vemidi-crafts.com`, `vemidi-crafts.com`) |
| `quantity` / `qty` | Количество (1–99) |

### Опционални продуктови опции

#### Legacy (съществуващи продукти)

| Параметър | Описание |
|-----------|----------|
| `color_{FIELD_UUID}` | UUID на избрана цветова опция за конкретно поле |
| `pf_{FIELD_KEY}` | Стойност за персонализация (само ако полето съществува за продукта) |

#### Универсални опции (препоръчително за нови продукти)

| Параметър | Описание |
|-----------|----------|
| `opt_{GROUP_UUID}` | Един UUID на стойност (`single`) или няколко UUID, разделени със запетая (`multiple`) |
| `opt_text_{GROUP_UUID}` | Текст/дата за група от тип `text`, `textarea` или `date` |

Правила:

- използвайте само групи и стойности, конфигурирани за конкретния продукт;
- не подавайте `price`, `price_delta` или крайна цена;
- неактивни, изчерпани или скрити dependency групи се отхвърлят;
- при липсваща задължителна универсална опция → redirect към `/products/{PRODUCT_UUID}?campaign=...`.

UTM параметрите (`utm_*`) се игнорират и не записват.

## Примери

### Прост продукт без опции

```
https://vemidi-crafts.com/campaign-checkout?product=11111111-1111-1111-1111-111111111111&campaign=butterflies&quantity=1
```

### Продукт с цвят и текст (legacy)

```
https://vemidi-crafts.com/campaign-checkout?product=11111111-1111-1111-1111-111111111111&campaign=butterflies&color_22222222-2222-2222-2222-222222222222=44444444-4444-4444-4444-444444444444&pf_message=Честит%20рожден%20ден
```

### Продукт с универсални опции

```
https://vemidi-crafts.com/campaign-checkout?product=11111111-1111-1111-1111-111111111111&campaign=frames&opt_22222222-2222-2222-2222-222222222222=44444444-4444-4444-8444-444444444444&opt_33333333-3333-3333-8333-333333333333=55555555-5555-4555-8555-555555555555,66666666-6666-4666-8666-666666666666&opt_text_77777777-7777-4777-8777-777777777777=2026-06-15
```

Където:

- `opt_{GROUP_UUID}` съдържа UUID на избрана стойност или списък за `multiple`;
- `opt_text_{GROUP_UUID}` съдържа URL-encoded текст или дата `YYYY-MM-DD`.

### CTA от landing страница (HTML)

```html
<a
  href="https://vemidi-crafts.com/campaign-checkout?product=PRODUCT_UUID&campaign=butterflies&landing=https%3A%2F%2Fspecial.vemidi-crafts.com%2Fvalshebni-peperudi"
>
  Поръчай сега
</a>
```

## Какво landing страницата **никога** не трябва да подава

- `price`, `discount`, `total`, `promo`, `promotion`
- лични данни (`email`, `phone`, `name`)
- произволни ключове за непозволени опции
- цена или отстъпка извън магазина

Цената и активните промоции се изчисляват **само сървърно** в магазина.

## Поток

1. Landing CTA води към `/campaign-checkout` на основния домейн.
2. Магазинът валидира продукта и опциите сървърно.
3. При липсващи задължителни опции → пренасочване към `/products/{id}?campaign=...`.
4. При валидна конфигурация → добавяне в количката на магазина + пренасочване към `/checkout`.
5. Поръчката се създава чрез съществуващия `create_store_order` RPC.

## Attribution в поръчката

След SQL миграция `supabase/campaign_order_attribution.sql`:

- `raw_payload.source` — напр. `campaign-butterflies`
- `raw_payload.campaign` — slug на кампанията
- `raw_payload.landingUrl` — одобрен landing URL без query string с лични данни

Стандартните поръчки от магазина остават с `source = vemidi-store`.

## Липсващи опции

Ако продуктът изисква цвят, размер или персонализация, handoff-ът **не** добавя непълен ред. Потребителят се пренасочва към продуктовата страница в магазина, където избира опциите и запазва `campaign` в URL.

## Refresh без дублиране

Повторно зареждане на `/campaign-checkout` със същата конфигурация използва session signature и **не** добавя втори ред — пренасочва директно към checkout.

## Checklist за нова landing страница

- [ ] CTA сочи към `vemidi-crafts.com/campaign-checkout`
- [ ] Подаден е валиден `product` UUID
- [ ] Подаден е `campaign` slug
- [ ] Няма цена или отстъпка в URL
- [ ] Няма лични данни в URL
- [ ] За продукти с опции — подайте валидни `opt_*` / `opt_text_*` (нов модел) или legacy `color_*` / `pf_*`, или оставете магазина да събере липсващите
- [ ] Тествайте на мобилен и desktop
- [ ] Потвърдете поръчката в админ → Поръчки (източник/кампания)

## Бутон „Разгледай подробно“ (бъдеща опция)

В момента **няма** поле в `products` за външен landing URL.

Предложена миграция (не е изпълнена):

```sql
alter table public.products
  add column if not exists landing_page_url text;

alter table public.products
  add constraint products_landing_page_url_https_check
  check (
    landing_page_url is null
    or landing_page_url ~ '^https://(special\.)?vemidi-crafts\.com/'
  );
```

До добавяне на полето, линкът към landing остава отговорност на кампанийната страница, не на продуктовата карта в магазина.
