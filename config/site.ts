export const siteConfig = {
  name: "VeMiDi crafts",
  description:
    "Ръчно изработени и персонализирани подаръци за специални поводи, дома и хората, които обичате.",
  navigation: [
    { href: "/", label: "Начало" },
    { href: "/shop", label: "Продукти" },
    { href: "/categories", label: "Категории" },
    { href: "/occasions", label: "По повод" },
    { href: "/events", label: "Събития" },
    { href: "/blog", label: "Блог" },
    { href: "/about", label: "За нас" },
    { href: "/contact", label: "Контакти" },
  ],
  footerLinks: [
    { href: "/shop", label: "Всички продукти" },
    { href: "/categories", label: "Категории" },
    { href: "/occasions", label: "По повод" },
  ],
  informationLinks: [
    { href: "/delivery", label: "Доставка и плащане" },
    { href: "/returns", label: "Връщане и рекламации" },
    { href: "/withdrawal", label: "Отказ от договор" },
    { href: "/terms", label: "Общи условия" },
    { href: "/privacy", label: "Поверителност" },
    { href: "/cookies", label: "Бисквитки" },
    { href: "/contact", label: "Контакти" },
  ],
  business: {
    legalName: "Дрийм Гифтс ЕООД",
    registrationNumber: "208135190",
    address: "София, Младост 2, блок 210",
    email: "vemidi.crafts@gmail.com",
    phoneDisplay: "0895 627 631",
    phoneHref: "+359895627631",
  },
  topBar: {
    message: "Ръчно изработено с внимание към всеки детайл",
    secondary: "Персонализация и изработка по поръчка",
    social: {
      instagram: "https://www.instagram.com/podari.mi.spomen/",
      facebook: "https://www.facebook.com/profile.php?id=100090185474431",
      tiktok: "https://www.tiktok.com/@vemidi.crafts",
      pinterest: "",
    },
  },
} as const;
