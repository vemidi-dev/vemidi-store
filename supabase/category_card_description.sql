-- Short description text shown on category cards in the storefront.

alter table public.categories
  add column if not exists card_description text;

comment on column public.categories.card_description is
  'Short text shown below the category title on category cards.';

-- Backfill known product-category slugs from the previous hardcoded map.
update public.categories
set card_description = case slug
  when 'plik-za-pari' then 'Елегантни пликове за пари за всеки специален повод.'
  when 'plikove-za-pari' then 'Елегантни пликове за пари за всеки специален повод.'
  when 'kutii' then 'Красиви кутии за спомени, подаръци и специални моменти.'
  when 'kutii-i-kutiyki' then 'Красиви кутии за спомени, подаръци и специални моменти.'
  when 'ramki-i-pana' then 'Персонализирани рамки и пана с лично послание.'
  when 'gips' then 'Нежни подаръци и декорации със скандинавски мъх.'
  when 'skandinavski-muh' then 'Нежни подаръци и декорации със скандинавски мъх.'
  when 'sakndinavski muh' then 'Нежни подаръци и декорации със скандинавски мъх.'
  when 'sakndinavski-muh' then 'Нежни подаръци и декорации със скандинавски мъх.'
  when 'zakachalki' then 'Практични аксесоари, превърнати в личен подарък.'
  when 'podaracheta-za-gosti' then 'Малки жестове с голямо значение за Вашите гости.'
  when 'tvorcheski-komplekti' then 'Комплекти за творчество, въображение и споделено време.'
  when 'sapuneni-rozi' then 'Ароматни цветя, които запазват красотата си.'
end
where card_description is null
  and slug in (
    'plik-za-pari',
    'plikove-za-pari',
    'kutii',
    'kutii-i-kutiyki',
    'ramki-i-pana',
    'gips',
    'skandinavski-muh',
    'sakndinavski muh',
    'sakndinavski-muh',
    'zakachalki',
    'podaracheta-za-gosti',
    'tvorcheski-komplekti',
    'sapuneni-rozi'
  );
