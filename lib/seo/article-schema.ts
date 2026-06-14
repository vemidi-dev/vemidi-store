import type { BlogPostRow } from "@/lib/admin/types";
import { siteConfig } from "@/config/site";
import { buildAbsoluteUrl } from "@/lib/seo/breadcrumbs";

const LOGO_PATH = "/assets/logo-transparent-color.png";

function toAbsoluteImageUrl(imageUrl: string | null, siteUrl: URL): string | undefined {
  if (!imageUrl?.trim()) {
    return undefined;
  }

  try {
    return new URL(imageUrl, siteUrl).toString();
  } catch {
    return undefined;
  }
}

export function buildArticleSchema(
  post: BlogPostRow,
  siteUrl: URL,
) {
  const url = buildAbsoluteUrl(`/blog/${post.slug}`, siteUrl);
  const image = toAbsoluteImageUrl(post.image_url, siteUrl);
  const authorName = post.author?.trim();
  const author = authorName
    ? {
        "@type": "Person",
        name: authorName,
      }
    : {
        "@type": "Organization",
        name: siteConfig.name,
      };

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    ...(image ? { image: [image] } : {}),
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    dateModified: post.updated_at,
    author,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: buildAbsoluteUrl(LOGO_PATH, siteUrl),
      },
    },
    mainEntityOfPage: url,
    url,
  };
}
