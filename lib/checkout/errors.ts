export const checkoutErrorMessages: Record<string, string> = {
  invalid_customer_name: "Моля, въведете име и фамилия.",
  invalid_customer_phone: "Моля, въведете валиден телефон.",
  invalid_customer_email: "Имейл адресът не е валиден.",
  invalid_courier: "Изберете куриер.",
  invalid_delivery_type: "Изберете начин на доставка.",
  invalid_city: "Въведете населено място.",
  office_required: "Въведете офис на куриера.",
  address_required: "Въведете пълен адрес за доставка.",
  empty_order: "Количката е празна.",
  too_many_items: "Поръчката съдържа твърде много артикули.",
  invalid_order_item: "В количката има невалиден артикул.",
  invalid_quantity: "В количката има невалидно количество.",
  product_not_found: "Някой от продуктите вече не е наличен.",
  product_sold_out: "Някой от продуктите в количката е изчерпан.",
  product_unavailable: "Някой от продуктите временно не може да бъде поръчан.",
  insufficient_stock:
    "Няма достатъчна наличност за един или повече продукти. Върнете се в количката и коригирайте количествата.",
  invalid_product_price: "Цената на продукт не може да бъде потвърдена.",
  invalid_upsell_price: "Цената на специалната оферта не може да бъде потвърдена.",
  invalid_upsell_offer:
    "Една от специалните оферти вече не е активна. Върнете се в количката и я добавете отново.",
  invalid_upsell_quantity:
    "Количеството за специална оферта е по-голямо от позволеното.",
  upsell_only_product_requires_offer:
    "Този артикул се предлага само като добавка към друг продукт.",
  personalization_too_long: "Текстът за персонализация е твърде дълъг.",
  invalid_personalization_fields: "Данните за персонализация са невалидни.",
  required_personalization_missing: "Попълнете всички задължителни полета за персонализация.",
  invalid_personalization_date: "Въведете валидна дата в полето за персонализация.",
  product_not_customizable: "Избран продукт не поддържа персонализация.",
  invalid_color_count: "Изберете необходимия брой цветове за продукта.",
  invalid_color_selection: "Някой от избраните цветове вече не е наличен.",
  invalid_option_selections: "Изборът на опции е невалиден.",
  invalid_option_group: "Подадена е непозволена група опции.",
  duplicate_option_group: "Дублирана група опции.",
  duplicate_option_value: "Една и съща стойност на опция е подадена повече от веднъж.",
  invalid_option_value: "Подадена е непозволена стойност на опция.",
  invalid_option_count: "Броят избрани опции не е валиден.",
  required_option_missing: "Попълнете всички задължителни опции.",
  option_dependency_not_met: "Условната опция не е достъпна.",
  option_value_sold_out: "Избраната опция е изчерпана.",
  option_text_too_long: "Текстът в опцията е твърде дълъг.",
  invalid_option_date: "Въведете валидна дата в опцията.",
  invalid_idempotency_key:
    "Заявката за поръчка е невалидна. Презаредете страницата и опитайте отново.",
  order_request_in_progress:
    "Поръчката вече се обработва. Изчакайте момент и опитайте отново.",
  rate_limit_exceeded:
    "Направени са твърде много опити. Изчакайте 15 минути и опитайте отново.",
  coupon_invalid: "Кодът за отстъпка е невалиден.",
  coupon_used: "Този код за отстъпка вече е използван.",
  coupon_inactive: "Този код за отстъпка не е активен.",
};

export function mapCheckoutError(message: string) {
  const knownError = Object.entries(checkoutErrorMessages).find(([code]) =>
    message.includes(code),
  );

  return knownError?.[1] ?? "Поръчката не беше записана. Моля, опитайте отново.";
}
