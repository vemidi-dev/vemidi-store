import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

export type SiteContentRow = {
  key: string;
  value: string;
  label: string;
  section: string;
  sort_order: number;
  is_multiline: boolean;
};

export const siteContentDefaults = {
  "header.tagline": "Подари ми спомен",
  "home.hero_eyebrow": "Персонализирани подаръци със сърце",
  "home.hero_title_line_1": "Подаръци,",
  "home.hero_title_line_2": "които носят",
  "home.hero_title_accent": "лично послание",
  "home.hero_description":
    "Ръчно изработени подаръци, декорации и творчески комплекти за специални моменти и любими хора.",
  "home.quick_occasions": "Търся подарък за повод",
  "home.quick_categories": "Изберете продукт",
  "home.quick_personalized": "Искам персонализиран подарък",
  "home.quick_events": "Творчески събития",
  "home.featured_eyebrow": "Подбрано от ателието",
  "home.featured_title": "Избрани подаръци",
  "home.featured_description":
    "Ръчно изработени идеи за специални хора и важни моменти.",
  "home.featured_button": "Вижте всички продукти",
  "home.occasions_title": "Пазарувай по повод",
  "home.categories_title": "Пазарувай по вид продукт",
  "home.process_eyebrow": "Лесно и лично",
  "home.process_title": "Как да поръчам",
  "home.process_step_1_title": "Изберете продукт",
  "home.process_step_1_text":
    "Открий подходящ подарък по вид или повод.",
  "home.process_step_2_title": "Персонализирай",
  "home.process_step_2_text":
    "Добавете име, дата, послание и предпочитани цветове.",
  "home.process_step_3_title": "Потвърдете поръчката",
  "home.process_step_3_text":
    "Въведете доставка, а ние ще потвърдим детайлите.",
  "home.process_note":
    "След поръчката ще се свържем с вас за потвърждение на детайлите и срока за изработка.",
  "home.atelier_eyebrow": "Създадено с любов",
  "home.atelier_title": "Малки детайли,",
  "home.atelier_title_accent": "голямо значение",
  "home.atelier_text":
    "Всеки подарък от VeMiDi crafts е създаден, за да предаде емоция, благодарност и обич. Вярваме, че най-хубавите подаръци са тези, които идват от сърцето.",
  "home.atelier_button": "Научете повече за нас",
  "shop.hero_title": "Продукти",
  "shop.hero_description":
    "Разгледайте нашите ръчно изработени подаръци, декорации и творчески комплекти за специални моменти и любими хора.",
  "shop.search_placeholder": "Търсете продукт или идея...",
  "categories.hero_title": "Категории",
  "categories.hero_description":
    "Разгледайте нашите продукти, групирани по видове, за да намерите лесно ръчно изработения подарък, който търсите.",
  "categories.occasions_eyebrow": "Още идеи",
  "categories.occasions_title": "Разгледайте и по повод",
  "categories.products_cta_title": "Разгледайте всички продукти",
  "categories.products_cta_text":
    "Открийте още ръчно изработени подаръци, създадени с внимание и любов.",
  "categories.products_cta_button": "Към всички продукти",
  "categories.custom_cta_title": "Нуждаете се от нещо специално?",
  "categories.custom_cta_text":
    "Свържете се с нас и ще обсъдим персонализиран подарък специално за Вас.",
  "categories.custom_cta_button": "Свържете се с нас",
  "occasions.hero_eyebrow": "Подаръци за специалните моменти",
  "occasions.hero_title": "По повод",
  "occasions.hero_description":
    "Открийте перфектния подарък за всеки специален момент.",
  "occasions.cta_eyebrow": "Не намирате Вашия повод?",
  "occasions.cta_title": "Ще създадем нещо лично за Вас",
  "occasions.cta_text":
    "Разкажете ни за човека и момента, а ние ще Ви помогнем да изберете подходящ персонализиран подарък.",
  "occasions.cta_button": "Свържете се с нас",
  "contact.eyebrow": "Свържете се с ателието",
  "contact.hero_title": "Нека създадем нещо специално",
  "contact.hero_description":
    "Имате идея за персонализиран подарък, въпрос за продукт или конкретен срок? Разкажете ни и ще ви помогнем да намерите най-подходящото решение.",
  "contact.social_title": "Пишете ни там, където ви е удобно",
  "contact.social_description":
    "За бърз въпрос, снимка или идея за персонализация най-лесно ще се свържете с нас през социалните мрежи.",
  "contact.response_note":
    "Обикновено отговаряме в рамките на един работен ден.",
  "contact.custom_order_title": "Персонална поръчка",
  "contact.custom_order_text":
    "Изпратете ни повод, желан продукт, име или послание и ориентировъчен срок. Ще обсъдим възможностите преди изработката.",
  "business.email": siteConfig.business.email,
  "business.phone_display": siteConfig.business.phoneDisplay,
  "business.phone_href": siteConfig.business.phoneHref,
  "business.address": siteConfig.business.address,
  "about.hero_eyebrow": "VeMiDi crafts",
  "about.hero_title": "За нас",
  "about.hero_description":
    "Вярваме, че най-хубавите подаръци не са просто предмети — те носят спомен, емоция и лично послание.",
  "about.intro_title": "Персонализирани подаръци с душа",
  "about.intro_text":
    "Създаваме персонализирани подаръци и декорации от дърво, изработени с внимание към всеки детайл. Всеки продукт започва като идея, преминава през прецизно лазерно изрязване и гравиране, а след това се довършва ръчно, за да се превърне в нещо специално и лично.",
  "about.section_1_title": "Подаръци за важните моменти",
  "about.section_1_text":
    "При нас ще откриете подаръци за сватба, кръщене, рожден ден, юбилей, учител, бебе, нов дом и още много специални поводи. Всеки продукт може да бъде персонализиран с име, дата, послание или детайл, който да го направи наистина уникален.\n\nНезависимо дали търсите нежен плик за пари, кутия за спомени, рамка със скандинавски мъх, подарък за учител или творчески комплект за дете — нашата цел е подаръкът да бъде не просто красив, а запомнящ се.",
  "about.section_2_title": "Ръчна изработка с отношение",
  "about.section_2_text":
    "Работим с естествени материали, най-често брезов шперплат, и комбинираме дърво, гравюра, цветове, панделки, мъх и други декоративни елементи. Обичаме изчистената визия, нежните цветове и малките детайли, които правят всеки продукт различен.\n\nЗа нас е важно подаръкът да изглежда красиво, но и да носи лично усещане — като нещо създадено специално за човека, който ще го получи.",
  "about.section_3_title": "Как поръчвате",
  "about.section_3_text":
    "Избирате продукт, добавяте желаната персонализация, а след това се свързваме с вас за потвърждение на детайлите и срока за изработка. Така сме сигурни, че всичко ще бъде подготвено точно както го искате.",
  "about.closing_text":
    "Благодарим ви, че избирате ръчно изработени подаръци с душа.",
  "about.closing_tagline": "VeMiDi Crafts — Подари ми спомен",
  "about.cta_button": "Разгледайте продуктите",
  "cart.hero_eyebrow": "Количка",
  "cart.hero_title": "Преглед на поръчката",
  "cart.hero_description":
    "Проверете продуктите, количествата и персонализацията преди данните за доставка.",
  "cart.empty_title": "Количката е празна",
  "cart.empty_text": "Разгледайте магазина и добавете нещо специално.",
  "cart.empty_button": "Към продуктите",
  "cart.items_title": "Избрани продукти",
  "cart.continue_shopping": "Продължете пазаруването",
  "cart.summary_title": "Обобщение",
  "cart.shipping_note":
    "Доставката и начинът на получаване се избират в следващата стъпка.",
  "cart.checkout_button": "Продължете към поръчка",
  "cart.payment_note": "Плащане с наложен платеж",
  "checkout.hero_eyebrow": "Поръчка",
  "checkout.hero_title": "Данни за доставка",
  "checkout.hero_description":
    "Прегледайте продуктите и попълнете информацията за доставка. Плащането е с наложен платеж при получаване.",
  "checkout.empty_title": "Няма продукти за поръчка",
  "checkout.empty_text":
    "Добавете продукт в количката, преди да преминете към данните за доставка.",
  "checkout.empty_button": "Към магазина",
  "checkout.contact_eyebrow": "01 · Контакт",
  "checkout.contact_title": "Вашите данни",
  "checkout.delivery_eyebrow": "02 · Доставка",
  "checkout.delivery_title": "Адрес и начин на доставка",
  "checkout.payment_eyebrow": "03 · Плащане и бележка",
  "checkout.payment_title": "Наложен платеж",
  "checkout.payment_text":
    "Плащате на куриера при получаване на поръчката.",
  "checkout.privacy_consent":
    "Съгласен/на съм данните ми да бъдат използвани за обработване и доставка на тази поръчка съгласно",
  "checkout.summary_eyebrow": "Обобщение",
  "checkout.summary_title": "Вашата поръчка",
  "checkout.delivery_price_note":
    "Цената за доставка се заплаща отделно според тарифата на избрания куриер.",
  "checkout.submit_button": "Изпратете поръчката",
  "checkout.back_to_cart": "Назад към количката",
  "delivery.hero_eyebrow": "Полезна информация",
  "delivery.hero_title": "Доставка и плащане",
  "delivery.hero_description":
    "Как подготвяме, потвърждаваме и изпращаме вашата поръчка.",
  "delivery.updated_at": "Последна актуализация: 28 май 2026 г.",
  "delivery.courier_title": "Куриер и начин на доставка",
  "delivery.courier_intro":
    "Доставката се извършва чрез Еконт или Спиди според избора на клиента при завършване на поръчката.",
  "delivery.courier_items":
    "до офис на куриер;\nдо автомат на куриер, когато услугата е налична;\nдо посочен адрес.",
  "delivery.timelines_title": "Срокове",
  "delivery.timelines_text":
    "Обичайният срок за изработка е от 1 до 5 работни дни, освен ако в страницата на продукта не е посочено друго. Срокът за доставка зависи от графика и условията на избрания куриер.\n\nПри натоварени периоди, официални празници или изделия със сложна персонализация срокът се уточнява допълнително.",
  "delivery.price_title": "Цена на доставката",
  "delivery.price_text":
    "Цената се определя по тарифата на избрания куриер и не е включена в цената на продуктите, освен ако изрично не е посочено друго.",
  "delivery.payment_title": "Плащане",
  "delivery.payment_text":
    "Плащането е само с наложен платеж при получаване на пратката. Магазинът не събира и не обработва данни за банкови карти.",
  "delivery.address_title": "Данни за доставка",
  "delivery.address_text":
    "Клиентът носи отговорност за правилно въведените име, телефон, населено място, адрес или офис. Неточни данни могат да доведат до забавяне или невъзможност за доставка.",
  "returns.hero_eyebrow": "Помощ при проблем",
  "returns.hero_title": "Връщане и рекламации",
  "returns.hero_description":
    "Как да заявите отказ или да ни уведомите за дефект и несъответствие.",
  "returns.updated_at": "Последна актуализация: 28 май 2026 г.",
  "returns.withdrawal_title": "Право на отказ",
  "returns.withdrawal_text":
    "За неперсонализирани продукти клиентът има право на отказ в 14-дневен срок от получаването, при спазване на законовите условия и връщане на стоката в добър търговски вид.",
  "returns.personalized_title": "Персонализирани продукти",
  "returns.personalized_text":
    "Изделия, изработени по поръчка или с персонализирано име, дата, текст или друга индивидуална характеристика, могат да не подлежат на отказ и връщане, освен при дефект, несъответствие или грешка от страна на търговеца.",
  "returns.claim_title": "Процедура за рекламация",
  "returns.claim_items":
    "свържете се с нас по имейл или телефон и опишете проблема;\nпосочете дата и данни за поръчката;\nприложете снимки при видим дефект или транспортна повреда;\nизчакайте инструкции, преди да изпратите продукта обратно.",
  "returns.costs_title": "Разходи по връщането",
  "returns.costs_text":
    "При отказ без дефект разходите за връщане са за сметка на клиента, освен ако не е уговорено друго. При основателна рекламация условията се уточняват според конкретния случай.",
  "returns.contact_title": "Контакт",
  "terms.hero_eyebrow": "Информация за клиента",
  "terms.hero_title": "Общи условия",
  "terms.hero_description":
    "Основни правила при поръчка на готови и персонализирани изделия.",
  "terms.updated_at": "Последна актуализация: 28 май 2026 г.",
  "terms.merchant_title": "Данни за търговеца",
  "terms.order_title": "Поръчка и потвърждение",
  "terms.order_text":
    "Изпращането на формата регистрира поръчка. При необходимост ще се свържем с клиента за уточняване на персонализацията, наличността, срока или данните за доставка.",
  "terms.pricing_title": "Цени и плащане",
  "terms.pricing_text":
    "Цените са обявени в евро (EUR). Курирската доставка не е включена, освен ако изрично не е посочено друго. Плащането е с наложен платеж при получаване.",
  "terms.personalized_title": "Персонализирани изделия",
  "terms.personalized_text":
    "Клиентът носи отговорност за точността на предоставените имена, дати и текстове. Преди изработка може да бъде поискано допълнително потвърждение.",
  "terms.shipping_title": "Доставка",
  "terms.shipping_text":
    "Поръчките се изпращат с Еконт или Спиди до офис, автомат или адрес според избора на клиента. Подробностите са публикувани в",
  "terms.returns_title": "Отказ, връщане и рекламации",
  "terms.returns_text": "Правилата и процедурата са описани в",
  "privacy.hero_eyebrow": "Лични данни",
  "privacy.hero_title": "Политика за поверителност",
  "privacy.hero_description":
    "Използваме информацията, необходима за поръчки и комуникация, и уважаваме избора ви за аналитични и маркетингови технологии.",
  "privacy.updated_at": "Последна актуализация: 29 юни 2026 г.",
  "privacy.controller_title": "Администратор на данните",
  "privacy.data_title": "Какви данни получаваме",
  "privacy.data_items":
    "име, телефон и предоставен имейл;\nнаселено място, адрес или офис и избран куриер;\nданни и бележки за поръчка или персонализация;\nданни, изпратени при записване за събитие или абонамент.",
  "privacy.usage_title": "За какво ги използваме",
  "privacy.usage_text":
    "За обработване, изработка, потвърждение и доставка на поръчки, управление на записвания, отговор на запитвания и изпълнение на законови задължения.",
  "privacy.storage_title": "Съхранение и достъп",
  "privacy.storage_text":
    "Данните за магазина се съхраняват в инфраструктурата на Supabase и са достъпни само за нуждите на магазина. На куриер се предоставят единствено данните, необходими за доставката.",
  "privacy.retention_title": "Срок за съхранение",
  "privacy.retention_text":
    "Информацията се пази за срок, необходим за изпълнение на поръчката, рекламации, счетоводни и други законови задължения.",
  "privacy.rights_title": "Вашите права",
  "privacy.rights_text":
    "Можете да поискате достъп, корекция, ограничаване, изтриване или преносимост на данните и да възразите срещу обработването им в предвидените от закона случаи.",
  "privacy.consent_title": "Аналитични и маркетингови технологии",
  "privacy.consent_text":
    "Сайтът използва собствена система за съгласие с бисквитки. Необходимите механизми работят винаги, за да функционира магазинът. Когато са активирани в сайта, Google Analytics (GA4) се зарежда само при изрично съгласие за аналитични бисквитки, а Meta Pixel — само при съгласие за маркетингови бисквитки. Без съответното съгласие тези външни скриптове не се зареждат. Изборът ви се пази в браузъра и може да бъде променен по всяко време от „Настройки на бисквитките“ в долната част на сайта.",
  "cookies.hero_eyebrow": "Настройки на сайта",
  "cookies.hero_title": "Политика за бисквитки",
  "cookies.hero_description":
    "Как управляваме бисквитки, localStorage и съгласието ви за различни категории.",
  "cookies.updated_at": "Последна актуализация: 29 юни 2026 г.",
  "cookies.what_title": "Какво са бисквитките",
  "cookies.what_text":
    "Бисквитките и сходните технологии (напр. localStorage и sessionStorage) са малки записи в браузъра, които помагат на сайта да работи правилно, да запази състояние и да помни настройките ви.",
  "cookies.consent_title": "Управление на съгласието",
  "cookies.consent_text":
    "При първо посещение виждате банер за бисквитки с опции „Приемам всички“, „Отказвам всички“ и „Настройки“. Изборът ви се записва локално в браузъра под ключ vemidi_cookie_consent и включва три категории: необходими (винаги активни), аналитични и маркетингови (само при съгласие). Външни аналитични или рекламни скриптове (напр. Google Analytics и Meta Pixel), ако са активирани в сайта, не се зареждат, докато не дадете съответното съгласие.",
  "cookies.usage_title": "Необходими бисквитки и съхранение",
  "cookies.usage_text":
    "Тези механизми са нужни за основната работа на магазина и не изискват отделно съгласие:",
  "cookies.necessary_items":
    "количка в localStorage — за да запазите избраните продукти между посещения;\nвъзстановяване на checkout формата и временни данни за поръчка в sessionStorage;\nадминистраторска сесия — бисквитки за вход в админ панела (Supabase Auth);\ncampaign checkout handoff — краткотрайна бисквитка и sessionStorage запис при прехвърляне от кампанийна страница към checkout;\nзапис на избора ви за бисквитки (vemidi_cookie_consent) в localStorage;\nдруги технически записи в localStorage/sessionStorage, нужни за сигурност, навигация и коректна работа на сайта.",
  "cookies.analytics_title": "Аналитични бисквитки",
  "cookies.analytics_text":
    "Google Analytics (GA4) може да бъде активиран в сайта. В такъв случай се зарежда и използва само след изрично съгласие за аналитични бисквитки — без съгласие скриптът не се зарежда. Помага ни да разбираме как се използва сайтът (посещения, страници, обща употреба).",
  "cookies.marketing_title": "Маркетингови бисквитки",
  "cookies.marketing_text":
    "Meta Pixel може да бъде активиран в сайта. В такъв случай се зарежда и използва само след изрично съгласие за маркетингови бисквитки — без съгласие скриптът не се зарежда. Използва се например за измерване на рекламни кампании и персонализирани реклами.",
  "cookies.manage_title": "Промяна на избора",
  "cookies.manage_text":
    "Можете да промените или оттеглите съгласието си по всяко време чрез „Настройки на бисквитките“ в долната част на сайта (секция „Информация“). Отваря се панел с настройки, без да напускате текущата страница.",
  "cookies.contact_title": "Контакт",
  "cookies.contact_text": "При въпроси пишете на",
} as const;

export type SiteContentKey = keyof typeof siteContentDefaults;
export type SiteContent = Record<SiteContentKey, string>;

export type CartPageContent = Pick<
  SiteContent,
  | "cart.empty_title"
  | "cart.empty_text"
  | "cart.empty_button"
  | "cart.items_title"
  | "cart.continue_shopping"
  | "cart.summary_title"
  | "cart.shipping_note"
  | "cart.checkout_button"
  | "cart.payment_note"
>;

export type CheckoutPageContent = Pick<
  SiteContent,
  | "checkout.empty_title"
  | "checkout.empty_text"
  | "checkout.empty_button"
  | "checkout.contact_eyebrow"
  | "checkout.contact_title"
  | "checkout.delivery_eyebrow"
  | "checkout.delivery_title"
  | "checkout.payment_eyebrow"
  | "checkout.payment_title"
  | "checkout.payment_text"
  | "checkout.privacy_consent"
  | "checkout.summary_eyebrow"
  | "checkout.summary_title"
  | "checkout.delivery_price_note"
  | "checkout.submit_button"
  | "checkout.back_to_cart"
>;

export async function getSiteContent(): Promise<SiteContent> {
  const content = { ...siteContentDefaults } as SiteContent;
  const supabase = await createClient();
  if (!supabase) {
    return content;
  }

  const { data, error } = await supabase
    .from("site_content")
    .select("key,value");

  if (error) {
    return content;
  }

  (data ?? []).forEach((row) => {
    if (row.key in content && typeof row.value === "string") {
      content[row.key as SiteContentKey] = row.value;
    }
  });

  return content;
}
