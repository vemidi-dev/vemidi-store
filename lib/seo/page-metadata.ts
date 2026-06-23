import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import {
  appendOpenGraphAndTwitterImages,
  type SeoSocialImage,
} from "@/lib/seo/social-images";

const HOME_TITLE = `${siteConfig.name} | Персонализирани подаръци`;

const ABOUT_TITLE = "За нас";
const ABOUT_DESCRIPTION =
  "VeMiDi Crafts създава персонализирани подаръци и декорации от дърво с лазерно изрязване, гравиране и ръчна довършителна работа.";
const ABOUT_CANONICAL = "/za-nas";

export function buildHomePageMetadata(socialImage?: SeoSocialImage | null): Metadata {
  return appendOpenGraphAndTwitterImages(
    {
      title: { absolute: HOME_TITLE },
      description: siteConfig.description,
      alternates: { canonical: "/" },
      openGraph: {
        type: "website",
        locale: "bg_BG",
        url: "/",
        siteName: siteConfig.name,
        title: HOME_TITLE,
        description: siteConfig.description,
      },
      twitter: {
        card: "summary_large_image",
        title: HOME_TITLE,
        description: siteConfig.description,
      },
    },
    socialImage,
  );
}

export function buildAboutPageMetadata(socialImage?: SeoSocialImage | null): Metadata {
  return appendOpenGraphAndTwitterImages(
    {
      title: ABOUT_TITLE,
      description: ABOUT_DESCRIPTION,
      alternates: { canonical: ABOUT_CANONICAL },
      openGraph: {
        type: "website",
        locale: "bg_BG",
        url: ABOUT_CANONICAL,
        siteName: siteConfig.name,
        title: ABOUT_TITLE,
        description: ABOUT_DESCRIPTION,
      },
      twitter: {
        card: "summary_large_image",
        title: ABOUT_TITLE,
        description: ABOUT_DESCRIPTION,
      },
    },
    socialImage,
  );
}

export const notFoundPageMetadata: Metadata = {
  title: "Страницата не е намерена",
  robots: { index: false, follow: false },
};
