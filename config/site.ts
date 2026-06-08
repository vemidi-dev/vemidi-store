export const siteConfig = {
  name: "VeMiDi crafts",
  description:
    "Ръчно изработени и персонализирани подаръци за специални поводи, дома и хората, които обичате.",
  navigation: [
    { href: "/", label: "Начало" },
    { href: "/shop", label: "Магазин" },
    { href: "/categories", label: "Категории" },
  ],
  footerLinks: [
    { href: "/shop", label: "Всички продукти" },
    { href: "/categories", label: "Категории" },
    { href: "/cart", label: "Количка" },
  ],
  topBar: {
    message: "Ръчно изработено с внимание към всеки детайл",
    secondary: "Персонализация и изработка по поръчка",
    social: {
      instagram: "",
      facebook: "",
      pinterest: "",
    },
  },
} as const;
