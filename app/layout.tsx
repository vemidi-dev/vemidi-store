import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";

import { CartProvider } from "@/components/cart/cart-provider";
import { CookieConsentProvider } from "@/components/consent/cookie-consent-provider";
import { GoogleConsentModeBootstrap } from "@/components/consent/google-consent-mode-bootstrap";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteShell } from "@/components/layout/site-shell";
import { siteConfig } from "@/config/site";
import { buildSiteStructuredData } from "@/lib/seo/organization-schema";
import { getSiteUrl } from "@/lib/site-url";

import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: `${siteConfig.name} | Персонализирани подаръци`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
   verification: {
    other: {
      "p:domain_verify": "a15f9e3f348a85333466556af10a92e6",
    },
  },
  applicationName: siteConfig.name,
  category: "Ръчно изработени подаръци",
  keywords: [
    "персонализирани подаръци",
    "ръчно изработени подаръци",
    "подаръци по поръчка",
    "VeMiDi crafts",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "bg_BG",
    url: "/",
    siteName: siteConfig.name,
    title: `${siteConfig.name} | Персонализирани подаръци`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | Персонализирани подаръци`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const siteUrl = getSiteUrl();

  return (
    <html lang="bg" className={`${playfair.variable} ${inter.variable}`}>
      <body
        className={`${inter.className} bg-boutique-bg text-boutique-ink antialiased [font-feature-settings:'kern'_1,'liga'_1]`}
      >
        <JsonLd data={buildSiteStructuredData(siteUrl)} />
        <GoogleConsentModeBootstrap />
        <CartProvider>
          <CookieConsentProvider>
            <SiteShell>{children}</SiteShell>
          </CookieConsentProvider>
        </CartProvider>
      </body>
    </html>
  );
}
