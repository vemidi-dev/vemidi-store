-- Product page copy: price summary labels and service/info blocks.
-- Run manually in Supabase. Safe to re-run (on conflict do nothing).

insert into public.site_content (key, value, label, section, sort_order, is_multiline)
values
  (
    'product.price_summary_label',
    'Ориентировъчна цена',
    'Етикет за обобщена цена (персонализирани продукти)',
    'Продуктова страница',
    10,
    false
  ),
  (
    'product.price_summary_label_stock',
    'Цена за този продукт',
    'Етикет за обобщена цена (материали и наличности)',
    'Продуктова страница',
    20,
    false
  ),
  (
    'product.price_summary_note',
    '(окончателната се потвърждава при поръчка)',
    'Бележка под обобщената цена (персонализирани продукти)',
    'Продуктова страница',
    30,
    false
  ),
  (
    'product.service.production.title',
    'Изработка',
    'Service блок: изработка - заглавие',
    'Продуктова страница - Service блокове',
    110,
    false
  ),
  (
    'product.service.production.text',
    '1-5 работни дни в зависимост от натоварването. Ако ви е нужен друг срок,',
    'Service блок: изработка - текст',
    'Продуктова страница - Service блокове',
    120,
    true
  ),
  (
    'product.service.production.link_label',
    'свържете се с нас',
    'Service блок: изработка - текст на линка',
    'Продуктова страница - Service блокове',
    130,
    false
  ),
  (
    'product.service.production.link_href',
    '/kontakti',
    'Service блок: изработка - URL на линка',
    'Продуктова страница - Service блокове',
    140,
    false
  ),
  (
    'product.service.production.icon',
    'clock',
    'Service блок: изработка - икона (clock, truck, return, shield, package)',
    'Продуктова страница - Service блокове',
    150,
    false
  ),
  (
    'product.service.delivery.title',
    'Доставка',
    'Service блок: доставка - заглавие',
    'Продуктова страница - Service блокове',
    210,
    false
  ),
  (
    'product.service.delivery.text',
    'Еконт или Спиди - наложен платеж.',
    'Service блок: доставка - текст',
    'Продуктова страница - Service блокове',
    220,
    true
  ),
  (
    'product.service.delivery.link_label',
    'Вижте условията',
    'Service блок: доставка - текст на линка',
    'Продуктова страница - Service блокове',
    230,
    false
  ),
  (
    'product.service.delivery.link_href',
    '/delivery',
    'Service блок: доставка - URL на линка',
    'Продуктова страница - Service блокове',
    240,
    false
  ),
  (
    'product.service.delivery.icon',
    'truck',
    'Service блок: доставка - икона (clock, truck, return, shield, package)',
    'Продуктова страница - Service блокове',
    250,
    false
  ),
  (
    'product.service.returns.title',
    'Връщане',
    'Service блок: връщане - заглавие',
    'Продуктова страница - Service блокове',
    310,
    false
  ),
  (
    'product.service.returns.text',
    '14 дни за неперсонализирани продукти.',
    'Service блок: връщане - текст',
    'Продуктова страница - Service блокове',
    320,
    true
  ),
  (
    'product.service.returns.link_label',
    'Условия за връщане',
    'Service блок: връщане - текст на линка',
    'Продуктова страница - Service блокове',
    330,
    false
  ),
  (
    'product.service.returns.link_href',
    '/returns',
    'Service блок: връщане - URL на линка',
    'Продуктова страница - Service блокове',
    340,
    false
  ),
  (
    'product.service.returns.icon',
    'return',
    'Service блок: връщане - икона (clock, truck, return, shield, package)',
    'Продуктова страница - Service блокове',
    350,
    false
  )
on conflict (key) do nothing;
