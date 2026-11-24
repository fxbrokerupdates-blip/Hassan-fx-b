import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";
import type { BannerPrompt } from "@/types/db";
import { CopyButton } from "@/components/content/copy-button";
import { SaveButton } from "@/components/news/save-button";
import { ShareButton } from "@/components/news/share-button";
import { ReportButton } from "@/components/news/report-button";
import { SampleBadge } from "@/components/news/badges";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { labelOf, LANGUAGES, PROMPT_CATEGORIES } from "@/lib/defaults";
import { formatDate } from "@/lib/utils";

export function PromptCard({ p, signedIn, basePath }: { p: BannerPrompt; signedIn: boolean; basePath: string }) {
  const text = p.prompt_text;
  const locked = !text;
  return (
    <article className="card-plain flex flex-col overflow-hidden" id={`prompt-${p.id}`}>
      <TrackOnMount event="banner_prompt_view" content_type="banner_prompt" content_id={p.id.startsWith("sample-") ? undefined : p.id} />
      <div className="relative aspect-[16/9] bg-navy-950">
        <Image src={p.preview_image_url || "/images/banner-prompt.png"} alt="" fill sizes="400px" className="object-contain p-4" />
        <span className="absolute left-2 top-2 flex gap-1">
          {p.is_featured && <span className="badge-tag">Featured</span>}
          <SampleBadge show={p.is_sample} />
        </span>
        <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-semibold">{p.aspect_ratio}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          <span className="badge-tag">{labelOf(PROMPT_CATEGORIES, p.category)}</span>
          <span className="badge-normal normal-case">{labelOf(LANGUAGES, p.language)}</span>
          <span className="text-muted">{formatDate(p.publish_date)}</span>
        </div>
        <h3 className="font-condensed text-lg font-semibold">{p.title}</h3>
        <p className="mt-2 flex-1 whitespace-pre-wrap rounded-lg bg-navy-950/70 p-3 font-mono text-[13px] leading-5 text-white/85">
          {text ?? p.prompt_preview}
        </p>
        {p.related_article_id && <Link href={`${basePath}?related=${p.related_article_id}`} className="mt-2 text-xs text-gold-400">Related news</Link>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {locked ? (
            <Link href={`/signup?next=${encodeURIComponent(basePath)}`} className="btn-gold h-9 px-3 text-sm"><Lock className="size-4" />{signedIn ? "Members only" : "Sign up to copy"}</Link>
          ) : (
            <CopyButton text={text} event="banner_prompt_copy" contentType="banner_prompt" contentId={p.id} label="Copy Prompt" disabled={p.copy_enabled === false} />
          )}
          <SaveButton type="banner_prompt" id={p.id} title={p.title} />
          <ShareButton url={`${basePath}#prompt-${p.id}`} title={p.title} />
        </div>
        <div className="mt-3"><ReportButton contentType="banner_prompt" contentId={p.id} /></div>
      </div>
    </article>
  );
}
