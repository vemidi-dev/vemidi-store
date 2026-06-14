import { siteConfig } from "@/config/site";
import { buildAbsoluteUrl } from "@/lib/seo/breadcrumbs";

const LOGO_PATH = "/assets/logo-transparent-color.png";

function getSameAsLinks(): string[] {
  const links: string[] = [];

  for (const url of Object.values(siteConfig.topBar.social)) {
    if (typeof url === "string" && url.trim().length > 0) {
      links.push(url);
    }
  }

  return links;
}

export function buildOrganizationSchema(siteUrl: URL) {
  const sameAs = getSameAsLinks();

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteUrl.origin,
    logo: buildAbsoluteUrl(LOGO_PATH, siteUrl),
    email: siteConfig.business.email,
    telephone: siteConfig.business.phoneHref,
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function buildWebSiteSchema(siteUrl: URL) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteUrl.origin,
  };
}

export function buildSiteStructuredData(siteUrl: URL) {
  return [buildOrganizationSchema(siteUrl), buildWebSiteSchema(siteUrl)];
}
