import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import type { Article } from "@/types/db";
import { labelOf, MARKETS } from "@/lib/defaults";
import { timeAgo, truncate, cn } from "@/lib/utils";
import { PriorityBadge, SampleBadge } from "@/components/news/badges";
import { SaveButton } from "@/components/news/save-button";
import { ShareButton } from "@/components/news/share-button";

export function NewsCard({ a, variant = "default" }: { a: Article; variant?: "default" | "featured" | "compact" }) {
  const tag = a.news_type === "broker" ? (a.broker?.name ?? a.category?.name) : labelOf(MARKETS, a.market);
  const img = a.featured_image_url || (a.news_type === "broker" ? "/images/sample-broker.webp" : "/images/sample-trading.webp");
  if (variant === "compact") {
    return (
      <Link href={`/news/${a.slug}`} className="group flex gap-3 rounded-lg p-2 hover:bg-white/5">
        <Image src={img} alt="" width={96} height={64} className="h-16 w-24 shrink-0 rounded object-cover" />
        <span className="min-w-0">
          <span className="line-clamp-2 font-condensed text-[15px] font-semibold leading-5 group-hover:text-gold-400">{a.title}</span>
          <span className="mt-1 flex items-center gap-1 text-xs text-muted"><Clock className="size-3" />{timeAgo(a.original_published_at ?? a.published_at)}</span>
        </span>
      </Link>
    );
  }
  return (
    <article className={cn("fx-news-card card-plain group flex flex-col overflow-hidden transition hover:border-gold-500/60", variant === "featured" ? "md:flex-row fx-news-feature" : "fx-news-standard")}>
      <Link href={`/news/${a.slug}`} className={cn("relative block aspect-[16/9] shrink-0 overflow-hidden", variant === "featured" && "md:aspect-auto md:w-1/2")} tabIndex={-1} aria-hidden>
        <Image src={img} alt="" fill sizes="(min-width:1024px) 400px, 100vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
        <span className="absolute left-2 top-2 flex gap-1"><PriorityBadge priority={a.priority} /><SampleBadge show={a.is_sample} /></span>
      </Link>
      <div className="fx-news-copy flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          {tag && <span className="badge-tag">{tag}</span>}
          {a.category && a.news_type === "broker" && a.broker && <span className="text-muted">{a.category.name}</span>}
        </div>
        <h3 className={cn("font-condensed font-semibold leading-snug", variant === "featured" ? "text-2xl" : "text-[19px]")}>
          <Link href={`/news/${a.slug}`} className="hover:text-gold-400">{a.title}</Link>
        </h3>
        {a.summary && <p className="mt-2 text-sm leading-6 text-white/75">{truncate(a.summary, variant === "featured" ? 260 : 140)}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-muted">
          <span className="flex min-w-0 items-center gap-1">
            <Clock className="size-3.5 shrink-0" />
            <time dateTime={(a.original_published_at ?? a.published_at) ?? undefined}>{timeAgo(a.original_published_at ?? a.published_at)}</time>
            {a.source_name && <span className="truncate">· {a.source_name}</span>}
          </span>
          <span className="flex items-center gap-1">
            <SaveButton type="article" id={a.id} title={a.title} />
            <ShareButton url={`/news/${a.slug}`} title={a.title} contentId={a.id} />
          </span>
        </div>
      </div>
    </article>
  );
}
