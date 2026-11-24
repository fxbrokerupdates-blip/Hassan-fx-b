import type { Metadata } from "next";
import type { SiteConfig } from "@/lib/data/site";
import type { Article } from "@/types/db";
import { absoluteUrl } from "@/lib/utils";

/** Safe JSON-LD script (escapes "<" to prevent script injection). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function organizationJsonLd(config: SiteConfig) {
  const g = config.settings["site.general"];
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: g.name,
    url: absoluteUrl("/"),
    logo: absoluteUrl(g.logo_url || "/images/logo.png"),
    sameAs: config.social.map((s) => s.url).filter((u) => /^https:\/\/[^/]+\/.+/.test(u)),
  };
}

export function newsArticleJsonLd(a: Article, siteName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title.slice(0, 110),
    description: a.summary ?? undefined,
    image: a.featured_image_url ? [absoluteUrl(a.featured_image_url)] : undefined,
    datePublished: a.published_at,
    dateModified: a.updated_at,
    author: [{ "@type": "Organization", name: a.author_name || siteName }],
    publisher: { "@type": "Organization", name: siteName, logo: { "@type": "ImageObject", url: absoluteUrl("/images/logo.png") } },
    mainEntityOfPage: absoluteUrl(`/news/${a.slug}`),
    isBasedOn: a.original_url ?? undefined,
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function pageMetadata({ title, description, path, image, noindex }: {
  title: string; description?: string; path: string; image?: string | null; noindex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, images: image ? [{ url: image }] : undefined },
    twitter: { card: "summary_large_image", title, description },
    robots: noindex ? { index: false, follow: false } : undefined,
  };
}
