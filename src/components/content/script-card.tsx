import Link from "next/link";
import { Clock, Lock } from "lucide-react";
import type { VideoScript } from "@/types/db";
import { CopyButton } from "@/components/content/copy-button";
import { SaveButton } from "@/components/news/save-button";
import { ReportButton } from "@/components/news/report-button";
import { SampleBadge } from "@/components/news/badges";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { labelOf, LANGUAGES } from "@/lib/defaults";
import { durationLabel, formatDate } from "@/lib/utils";

export function scriptToText(s: VideoScript) {
  return [`TITLE: ${s.title}`, s.topic && `TOPIC: ${s.topic}`, `\nHOOK:\n${s.hook}`, s.body && `\nMAIN SCRIPT:\n${s.body}`,
    s.closing && `\nCLOSING:\n${s.closing}`, s.cta && `\nCTA:\n${s.cta}`].filter(Boolean).join("\n");
}

export function ScriptCard({ s, basePath }: { s: VideoScript; basePath: string }) {
  const full = Boolean(s.body);
  const rtl = s.language === "ar" || s.language === "ur";
  return (
    <article className="card-plain flex flex-col p-5" id={`script-${s.id}`}>
      <TrackOnMount event="video_script_view" content_type="video_script" content_id={s.id.startsWith("sample-") ? undefined : s.id} />
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="badge-tag"><Clock className="size-3" />{durationLabel(s.duration_seconds)}</span>
        <span className="badge-normal normal-case">{labelOf(LANGUAGES, s.language)}</span>
        {s.is_featured && <span className="badge-warm">Featured</span>}
        <SampleBadge show={s.is_sample} />
        <span className="text-muted">{formatDate(s.publish_date)}</span>
      </div>
      <h3 className="font-condensed text-xl font-semibold">{s.title}</h3>
      {s.topic && <p className="text-sm text-muted">{s.topic}</p>}
      <div dir={rtl ? "rtl" : undefined} className="mt-3 flex-1 space-y-3 rounded-lg bg-navy-950/70 p-4 text-[15px] leading-6 text-white/90">
        <p><span className="mr-2 text-xs font-bold uppercase text-gold-400">Hook</span>{s.hook}</p>
        {full ? (
          <>
            <p className="whitespace-pre-wrap"><span className="mr-2 text-xs font-bold uppercase text-gold-400">Script</span>{s.body}</p>
            {s.closing && <p><span className="mr-2 text-xs font-bold uppercase text-gold-400">Closing</span>{s.closing}</p>}
            {s.cta && <p><span className="mr-2 text-xs font-bold uppercase text-gold-400">CTA</span>{s.cta}</p>}
          </>
        ) : <p className="text-muted">Full script available to registered members.</p>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {full ? (
          <CopyButton text={scriptToText(s)} event="video_script_copy" contentType="video_script" contentId={s.id} label="Copy Script" disabled={s.copy_enabled === false} />
        ) : (
          <Link href={`/signup?next=${encodeURIComponent(basePath)}`} className="btn-gold h-9 px-3 text-sm"><Lock className="size-4" />Sign up for full script</Link>
        )}
        <SaveButton type="video_script" id={s.id} title={s.title} />
      </div>
      <div className="mt-3"><ReportButton contentType="video_script" contentId={s.id} /></div>
    </article>
  );
}
