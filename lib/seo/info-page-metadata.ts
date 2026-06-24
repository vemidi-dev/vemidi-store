import type { Metadata } from "next";

import {
  getSiteMediaMap,
  resolveSiteMediaFromMap,
} from "@/lib/content/site-media";
import {
  appendOpenGraphAndTwitterImages,
  type SeoSocialImage,
} from "@/lib/seo/social-images";

export type InfoPageMetadataInput = {
  title: string;
  description: string;
  canonicalPath: string;
};

export const KONTAKTI_PAGE_METADATA = {
  title: "Контакти",
  description:
    "Контакти, социални профили и данни за търговеца VeMiDi crafts.",
  canonicalPath: "/kontakti",
} as const satisfies InfoPageMetadataInput;

export const DELIVERY_PAGE_METADATA = {
  title: "Доставка и плащане",
  description:
    "Куриери, срокове за изработка, доставка и плащане на поръчки от VeMiDi crafts.",
  canonicalPath: "/delivery",
} as const satisfies InfoPageMetadataInput;

export const RETURNS_PAGE_METADATA = {
  title: "Връщане и рекламации",
  description:
    "Условия за отказ, връщане и рекламации на продукти от VeMiDi crafts.",
  canonicalPath: "/returns",
} as const satisfies InfoPageMetadataInput;

export const TERMS_PAGE_METADATA = {
  title: "Общи условия",
  description: "Общи условия за поръчки от онлайн магазина VeMiDi crafts.",
  canonicalPath: "/terms",
} as const satisfies InfoPageMetadataInput;

export const PRIVACY_PAGE_METADATA = {
  title: "Политика за поверителност",
  description: "Как VeMiDi crafts събира, използва и съхранява лични данни.",
  canonicalPath: "/privacy",
} as const satisfies InfoPageMetadataInput;

export const COOKIES_PAGE_METADATA = {
  title: "Политика за бисквитки",
  description:
    "Информация за техническите механизми и бисквитките в магазина VeMiDi crafts.",
  canonicalPath: "/cookies",
} as const satisfies InfoPageMetadataInput;

export function buildInfoPageMetadata(
  { title, description, canonicalPath }: InfoPageMetadataInput,
  socialImage?: SeoSocialImage | null,
): Metadata {
  return appendOpenGraphAndTwitterImages(
    {
      title,
      description,
      alternates: { canonical: canonicalPath },
      openGraph: {
        type: "website",
        title,
        description,
        url: canonicalPath,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    },
    socialImage,
  );
}

export async function buildInfoPageMetadataWithHomeHero(
  input: InfoPageMetadataInput,
): Promise<Metadata> {
  const siteMediaMap = await getSiteMediaMap();
  const heroImage = resolveSiteMediaFromMap(siteMediaMap, "home.hero");

  return buildInfoPageMetadata(input, {
    src: heroImage.src,
    alt: heroImage.alt,
  });
}
