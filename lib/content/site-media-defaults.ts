import type { SiteMediaKey } from "@/lib/content/site-media-types";

export type SiteMediaDefault = {
  src: string;
  alt: string;
};

export const siteMediaDefaults: Record<SiteMediaKey, SiteMediaDefault> = {
  "home.hero": {
    src: "/assets/home-hero.webp",
    alt: "Персонализирани подаръци от VeMiDi crafts",
  },
  "home.atelier": {
    src: "/assets/home-atelier.webp",
    alt: "Ателието на VeMiDi crafts",
  },
  "shop.hero": {
    src: "/assets/products.png",
    alt: "Продукти",
  },
  "categories.hero": {
    src: "/assets/banner-categories.webp",
    alt: "Категории",
  },
  "occasions.hero": {
    src: "/assets/povodi.png",
    alt: "По повод",
  },
  "blog.hero": {
    src: "/assets/cover-blog.png",
    alt: "Блог",
  },
  "events.hero": {
    src: "/assets/cover-events.png",
    alt: "Творчески работилници",
  },
  "about.hero": {
    src: "/assets/za-nas.png",
    alt: "За VeMiDi crafts",
  },
  "checkout.thank_you": {
    src: "/assets/thank-you.webp",
    alt: "Благодарим за поръчката",
  },
};
