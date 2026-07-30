# Блог система

## Публичен сайт

- `/blog` — списък (featured/popular филтри според данни).
- `/blog/[slug]` — статия: cover (`image_url`), rich body, related posts, product carousel, CTA към категория (ако е зададен), SEO/OG/JSON-LD.

## Админ

Tab `blog`:

1. **Blog categories** — CRUD (active/deactivate).
2. **Posts** — create/edit през `ContentManagementPanel` + `BlogRichTextEditor`.

### Полета на статия (основни)

Title, slug, excerpt, content, blog_category_id, author, read_minutes, is_featured, is_popular, CTA label + category, related products, cover image, draft/publish/delete.

## Rich text editor

Custom markdown-like textarea (не TipTap/Quill).

Поддържа:

- `**bold**`, `*italic*`
- `##` / `###` заглавия
- списъци
- `[текст](url)` линкове (само безопасни схеми)
- `{color:accent|sage|ochre|muted}…{/color}`
- **Inline images:** `![alt](url)` като отделен block ред

Има Edit / Preview режими. Preview ползва същия `BlogRichText` renderer като storefront.

### Добавяне на снимка в текста

1. Toolbar → **„Добави снимка“**.
2. Избор на JPEG/PNG/WebP.
3. По избор alt текст (prompt; препоръчителен).
4. Upload през `uploadBlogInlineImage` → `processAndUploadImages` с profile `blog`.
5. Вмъкване на markdown на курсора.
6. Loading / error state в editor-а.

Cover image („Основна снимка“) е **отделен** upload (`image_url`), не заменя inline images.

## Rendering / безопасност

- Parser allowlist: няма произволен HTML.
- Image URL: само `http(s)` или same-origin `/`; `javascript:` / `data:` се отхвърлят.
- Render с `next/image`, responsive `max-w-full`.
- Стари статии без images остават валидни.

## Storage

- Bucket: `product-images`
- Profile: `blog` (resize/compress → WebP)
- Scope: post id при редакция; иначе fixed `BLOG_INLINE_SCOPE_ID`
- **Нов SQL / bucket policy не е нужен** за inline images (при вече приложен image pipeline)

## Рискове

- Лош slug / unpublished пост.
- CTA към грешна/inactive категория.
- Объркване cover vs inline.
- Качване на неподдържан файл → ясна грешка от validation.
