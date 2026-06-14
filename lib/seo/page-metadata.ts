import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

const HOME_TITLE = `${siteConfig.name} | Персонализирани подаръци`;

export function buildHomePageMetadata(): Metadata {
  return {
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
  };
}

export const notFoundPageMetadata: Metadata = {
  title: "Страницата не е намерена",
  robots: { index: false, follow: false },
};
