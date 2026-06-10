# Снимки за сайта

Качвайте снимките в тази папка с имената по-долу.

## Начална страница

- `home-hero.webp` - основната голяма снимка
- `home-atelier.webp` - снимка за секцията за ателието

## Страница „Категории“

- `products.png` — банер за страницата „Продукти“ (`/shop`)
- `banner-categories.webp` - широк банер в горната част на страницата

## Страница „Събития“

- `sabitia.png` — банер за страницата „Събития“ (`/events`)
- `events-hero.webp` - алтернативно име (по избор)

## Страница „Блог“

- `cover-blog.png` — банер за страницата „Блог“ (`/blog`)
- `blog-hero.webp` - алтернативно име (по избор)
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
- `categories/product/gips.png` → slug `gips` (гипсови фигурки)
- `moss.png` → slug `sakndinavski muh` (скандинавски мъх)
- `semejni.jpg` → slug `family` (семейни подаръци)
- `categories/product/zakachalki-kluch.png` → slug `zakachalki`

Препоръчително: `.webp`, квадратно изображение.

### Поводи

Може в `categories/occasion/` или в корена на `assets/`:

- `8-mart.png` → slug `8-mart` (8 март)
- `velikden.png` → slug `velikden` (Великден)
- `koleda.png` → slug `koleda` (Коледа)
- `za-deca.png` → slug `za-deca` (За деца)
- `ocassion-new-home.png` → slug `home` (За нов дом)
- `occasion-krashtene.webp` → slug `krashtene`
- `occasion-bebe.png` → slug `bebe`
- `occasion-svatba.webp` → slug `svatba`

Картата с пътищата е в `lib/category-images.ts`.

## Други снимки в корена на assets

- `tvorcheski-komplekti.webp` — продуктова категория със slug `tvorcheski-komplekti`
- `povodi.png` — банер за страницата „По повод“ (`/occasions`)
- `occasions-hero.webp` — алтернативно име (по избор)

## Препоръки

- Използвайте `.webp` за снимките в сайта.
- Основната снимка е подходящо да бъде хоризонтална.
- Снимките за поводи е добре да са в съотношение `4:3`.
- Снимките за продуктови категории е добре да са квадратни.
- Използвайте малки букви, тирета и латински букви в имената.
- Препоръчителен размер на файл: до 500 KB.
