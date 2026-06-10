# Снимки за сайта

Качвайте снимките в тази папка с имената по-долу.

## Начална страница

- `home-hero.webp` - основната голяма снимка
- `home-atelier.webp` - снимка за секцията за ателието

## Страница „Категории“

- `banner-categories.webp` - широк банер в горната част на страницата

## Страница „Събития“

- `events-hero.webp` - основна снимка от творческа работилница или от ателието

## Страница „Блог“

- `blog-hero.webp` - широк банер с творческа или подаръчна композиция
- `blog-shop-promo.webp` - снимка в страничния блок към магазина

## Категории (начална страница, /categories, /occasions)

Снимките се връзват по **slug на категорията** от админ панела.

### Видове продукти

Папка: `categories/product/`

Името на файла = slug на категорията, например:

- `categories/product/kutii.png` → slug `kutii`
- `categories/product/plik-za-pari.png` → slug `plik-za-pari` (или `plikove-za-pari`)
- `categories/product/ramki-pana.jpg` → slug `ramki-i-pana`
- `categories/product/gosti.jpg` → slug `podaracheta-za-gosti`
- `categories/product/gips.png` → slug `gips`
- `categories/product/zakachalki-kluch.png` → slug `zakachalki`

Препоръчително: `.webp`, квадратно изображение.

### Поводи

Може в `categories/occasion/` или в корена на `assets/` с префикс `occasion-`:

- `occasion-krashtene.webp` → slug `krashtene`
- `occasion-bebe.png` → slug `bebe`
- `occasion-svatba.webp` → slug `svatba`

Картата с пътищата е в `lib/category-images.ts`.

## Други снимки в корена на assets

- `tvorcheski-komplekti.webp` — продуктова категория със slug `tvorcheski-komplekti`
- `occasions-hero.webp` — банер за страницата „По повод“

## Препоръки

- Използвайте `.webp` за снимките в сайта.
- Основната снимка е подходящо да бъде хоризонтална.
- Снимките за поводи е добре да са в съотношение `4:3`.
- Снимките за продуктови категории е добре да са квадратни.
- Използвайте малки букви, тирета и латински букви в имената.
- Препоръчителен размер на файл: до 500 KB.
