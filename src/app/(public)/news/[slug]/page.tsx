import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, ExternalLink, Sparkles, User } from "lucide-react";
import { getArticle, getRelated } from "@/lib/data/news";
import { getSiteConfig } from "@/lib/data/site";
import { NewsCard } from "@/components/news/news-card";
import { OriginBadge, PriorityBadge, SampleBadge } from "@/components/news/badges";
import { SaveButton } from "@/components/news/save-button";
import { ShareButton } from "@/components/news/share-button";
import { ReportButton } from "@/components/news/report-button";
import { RichText } from "@/components/ui/rich-text";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { ArticleEngagement, TrackOnMount } from "@/components/analytics/track-on-mount";
import { AdSlot } from "@/components/ads/ad-slot";
import { JsonLd, breadcrumbJsonLd, newsArticleJsonLd } from "@/lib/seo";
import { formatDate, timeAgo } from "@/lib/utils";
import { labelOf, MARKETS } from "@/lib/defaults";
import { createSupabasePublic } from "@/lib/supabase/server";

export const revalidate = 120;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) return { title: "Article not found", robots: { index: false } };
  const title = a.seo_title || a.title;
  const description = a.seo_description || a.summary || undefined;
  return {
    title,
    description,
    alternates: { canonical: a.canonical_url || `/news/${a.slug}` },
    robots: a.noindex || a.is_sample ? { index: false, follow: true } : undefined,
    openGraph: { type: "article", title, description, url: `/news/${a.slug}`, publishedTime: a.published_at ?? undefined,
      modifiedTime: a.updated_at, images: a.featured_image_url ? [{ url: a.featured_image_url }] : undefined },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) notFound();
  const [related, config] = await Promise.all([getRelated(a), getSiteConfig()]);
  const db = createSupabasePublic();
  const tags = db
    ? ((await db.from("news_article_tags").select("news_tags(slug,name)").eq("article_id", a.id)).data ?? [])
        .map((r) => (r as unknown as { news_tags: { slug: string; name: string } | null }).news_tags).filter(Boolean)
    : [];
  const crumbs = [
    { name: "Home", path: "/" },
    a.news_type === "broker" ? { name: "Broker Updates", path: "/broker-updates" } : { name: "Trading Updates", path: "/trading-updates" },
    { name: a.title.slice(0, 60), path: `/news/${a.slug}` },
  ];
  return (
    <article className="container-site py-8 fx-article-page">
      <JsonLd data={newsArticleJsonLd(a, config.settings["site.general"].name)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <TrackOnMount event="article_open" content_type="article" content_id={a.id} metadata={{ news_type: a.news_type }} />
      <ArticleEngagement id={a.id} newsType={a.news_type} />

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
            {crumbs.slice(0, 2).map((c) => <Link key={c.path} href={c.path} className="mr-2 hover:text-gold-400">{c.name} /</Link>)}
          </nav>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={a.priority} />
            <SampleBadge show={a.is_sample} />
            {a.category && <Link href={`/category/${a.category.slug}`} className="badge-tag">{a.category.name}</Link>}
            {a.broker && <Link href={`/brokers/${a.broker.slug}`} className="badge-normal normal-case hover:text-gold-400">{a.broker.name}</Link>}
            {a.market && <Link href={`/trading-updates?market=${a.market}`} className="badge-normal normal-case">{labelOf(MARKETS, a.market)}</Link>}
            {a.market_impact && <span className="badge-normal normal-case">{a.market_impact} impact</span>}
            <OriginBadge origin={a.content_origin} />
          </div>
          <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-[40px]">{a.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            {a.author_name && <span className="flex items-center gap-1"><User className="size-4" />{a.author_name}</span>}
            <span className="flex items-center gap-1"><CalendarDays className="size-4" /><time dateTime={a.published_at ?? undefined}>{formatDate(a.published_at, "UTC", true)} UTC</time> · {timeAgo(a.published_at)}</span>
            <span className="flex items-center gap-1"><Clock className="size-4" />{a.reading_minutes} min read</span>
          </div>
          {a.is_sample && (
            <p className="mt-4 rounded-lg border border-fuchsia-500/50 bg-fuchsia-500/10 p-3 text-sm text-fuchsia-100">
              This is development sample content. It is not real news and will not appear in production.
            </p>
          )}
          {a.featured_image_url && (
            <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-xl border border-white/10">
              <Image src={a.featured_image_url} alt="" fill priority sizes="(min-width:1024px) 800px, 100vw" className="object-cover" />
            </div>
          )}
          {a.summary && (
            <section aria-label="Summary" className="mt-6 rounded-xl border-l-4 border-gold-500 bg-white/5 p-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold-400">
                {a.content_origin === "ai_assisted" ? "AI-assisted summary — reviewed by our editors" : "Summary"}
              </p>
              <p className="text-[17px] leading-7 text-white/90">{a.summary}</p>
            </section>
          )}
          {a.key_highlights?.length > 0 && (
            <section aria-label="Key highlights" className="mt-6">
              <h2 className="mb-2 font-display text-lg font-bold">Key highlights</h2>
              <ul className="list-disc space-y-1 pl-6 text-white/90">{a.key_highlights.map((h) => <li key={h}>{h}</li>)}</ul>
            </section>
          )}
          <div id="article-body" className="mt-6">
            {a.content ? <RichText text={a.content} className="prose-fx" /> : null}
          </div>
          {(a.original_url || a.source_name) && (
            <section aria-label="Source" className="mt-8 rounded-xl bg-white/5 p-5 text-sm">
              <p className="font-semibold text-white">Source attribution</p>
              <p className="mt-1 text-white/75">
                Information in this article is attributed to <strong>{a.source_name ?? "the original publisher"}</strong>
                {a.original_published_at && <> (published {formatDate(a.original_published_at)})</>}. Third-party claims have not been independently verified unless stated.
              </p>
              {a.original_url && (
                <TrackedLink href={a.original_url} external event="source_link_click" content_type="article" content_id={a.id}
                  className="mt-3 inline-flex items-center gap-1 text-gold-400 hover:underline">Read the original source <ExternalLink className="size-4" /></TrackedLink>
              )}
            </section>
          )}
          {tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">{tags.map((t) => <span key={t!.slug} className="badge-normal normal-case">#{t!.name}</span>)}</div>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
            <SaveButton type="article" id={a.id} title={a.title} label />
            <ShareButton url={`/news/${a.slug}`} title={a.title} contentId={a.id} label />
            {config.flags.ai_studio && (
              <Link href={`/dashboard/studio?source=article&id=${a.id}`} className="btn-gold h-10 px-4">
                <Sparkles className="size-4" /> Create Content From This News
              </Link>
            )}
          </div>
          <div className="mt-6"><ReportButton contentType="article" contentId={a.id} /></div>
          <p className="mt-8 text-xs text-muted">{config.settings["site.footer"].risk_disclaimer}</p>
        </div>

        <aside className="space-y-6">
          <AdSlot placement="article_page" />
          <section className="card-plain p-4">
            <h2 className="mb-3 font-display text-lg font-bold">Related <span className="gold-text">news</span></h2>
            {related.length ? related.map((r) => <NewsCard key={r.id} a={r} variant="compact" />) : <p className="text-sm text-muted">No related articles yet.</p>}
          </section>
        </aside>
      </div>
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="section-title mb-4">More from <span className="gold-text">{a.news_type === "broker" ? "Broker Updates" : "Trading Updates"}</span></h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{related.map((r) => <NewsCard key={r.id} a={r} />)}</div>
        </section>
      )}
    </article>
  );
}
