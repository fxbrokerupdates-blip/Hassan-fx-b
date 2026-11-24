"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bookmark, Copy, Download, History, Loader2, RefreshCw, Save, Search, Sparkles, Trash2 } from "lucide-react";
import { AI_LANGUAGES, AUDIENCES, CONTENT_TYPES, LENGTHS, PLATFORMS, TONES } from "@/lib/ai/catalog";
import { ASPECT_RATIOS, DURATIONS } from "@/lib/defaults";
import { track } from "@/lib/analytics/client";
import { deleteGenerationAction, updateGenerationAction } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

type SourceKind = "broker" | "trading" | "topic" | "text" | "banner_prompt" | "video_script";
interface PickItem { id: string; title: string; meta?: string }

const SOURCES: { key: SourceKind; label: string }[] = [
  { key: "broker", label: "Broker news" }, { key: "trading", label: "Trading news" }, { key: "topic", label: "My own topic" },
  { key: "text", label: "Paste text" }, { key: "banner_prompt", label: "Banner prompt" }, { key: "video_script", label: "Video script" },
];

export function Studio({ adminStudio = false, providerReady, initial, remaining }: {
  adminStudio?: boolean; providerReady: boolean; providerLabel: string;
  initial?: { kind: SourceKind; item?: PickItem }; remaining?: { used: number; limit: number } | null;
}) {
  const [kind, setKind] = useState<SourceKind>(initial?.kind ?? "broker");
  const [selected, setSelected] = useState<PickItem | null>(initial?.item ?? null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PickItem[]>([]);
  const [text, setText] = useState("");
  const [contentType, setContentType] = useState("facebook_post");
  const [opts, setOpts] = useState({ language: "en", tone: "Professional", length: "Medium", audience: "Traders", platform: "Facebook",
    duration_seconds: 40, aspect_ratio: "1:1", custom_instructions: "", include_cta: true, include_hashtags: true, brand_name: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [gen, setGen] = useState<{ id: string; output: string; provider: string; model: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [used, setUsed] = useState(remaining?.used ?? 0);

  useEffect(() => { track("ai_studio_open", { feature: "ai_studio", metadata: { admin: adminStudio } }); }, [adminStudio]);

  const needsPicker = kind === "broker" || kind === "trading" || kind === "banner_prompt" || kind === "video_script";
  useEffect(() => {
    if (!needsPicker) return;
    const ctl = new AbortController();
    const apiKind = kind === "broker" || kind === "trading" ? "article" : kind;
    const t = setTimeout(() => {
      fetch(`/api/ai/sources?kind=${apiKind}&news_type=${kind}&q=${encodeURIComponent(query)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : { items: [] })).then((d) => setItems(d.items ?? [])).catch(() => undefined);
    }, 250);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [kind, query, needsPicker]);

  const isVideo = contentType.includes("video_script");
  const isBanner = contentType === "banner_prompt";
  const set = <K extends keyof typeof opts>(k: K, v: (typeof opts)[K]) => setOpts((o) => ({ ...o, [k]: v }));
  const canGenerate = providerReady && !busy && (needsPicker ? Boolean(selected) : text.trim().length >= (kind === "topic" ? 3 : 20));

  async function generate() {
    setBusy(true); setErr(null); setNote(null);
    const source_type = kind === "broker" || kind === "trading" ? "article" : kind;
    const res = await fetch("/api/ai/generate", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        admin_studio: adminStudio, source_type, source_id: needsPicker ? selected?.id : undefined, source_text: needsPicker ? undefined : text,
        options: { content_type: contentType, language: opts.language, tone: opts.tone, length: opts.length, audience: opts.audience, platform: opts.platform,
          duration_seconds: isVideo ? opts.duration_seconds : undefined, aspect_ratio: isBanner ? opts.aspect_ratio : undefined,
          custom_instructions: opts.custom_instructions || undefined, include_cta: opts.include_cta, include_hashtags: opts.include_hashtags,
          brand_name: opts.brand_name || undefined, website: opts.website || undefined },
      }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.error ?? "Generation failed."); return; }
    setGen(j); setDraft(j.output); setSaved(false); setUsed((u) => u + 1);
  }

  async function copy() {
    await navigator.clipboard.writeText(draft).catch(() => undefined);
    setNote("Copied to clipboard.");
    if (gen) track("ai_output_copy", { content_type: "ai_generation", content_id: gen.id });
  }
  async function save() {
    if (!gen) return;
    if (draft !== gen.output) await updateGenerationAction(gen.id, draft);
    const res = await fetch("/api/saved", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ content_type: "ai_generation", content_id: gen.id, title: CONTENT_TYPES.find((c) => c.value === contentType)?.label }) });
    if (res.ok) { setSaved(true); setNote("Saved to your content."); track("ai_output_save", { content_type: "ai_generation", content_id: gen.id }); }
  }
  async function saveEdit() {
    if (!gen) return;
    const r = await updateGenerationAction(gen.id, draft);
    setNote(r.error ?? "Edits saved."); if (!r.error) setGen({ ...gen, output: draft });
  }
  async function remove() {
    if (!gen || !confirm("Delete this generated content permanently?")) return;
    await deleteGenerationAction(gen.id);
    setGen(null); setDraft(""); setNote("Deleted.");
  }
  function download() {
    const blob = new Blob([draft], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fx-broker-updates-${contentType}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click(); URL.revokeObjectURL(a.href);
    if (gen) track("ai_output_download", { content_type: "ai_generation", content_id: gen.id });
  }

  const typeHint = useMemo(() => CONTENT_TYPES.find((c) => c.value === contentType)?.hint, [contentType]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-5">
        {!providerReady && (
          <div role="alert" className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <AlertTriangle className="size-5 shrink-0" />
            <span>The AI provider is not configured or AI is turned off. {adminStudio ? <Link href="/admin/ai-settings" className="underline">Open AI Settings</Link> : "Please check back later."}</span>
          </div>
        )}
        <section className="card-plain p-5">
          <h2 className="mb-3 font-display text-lg font-bold">1. Choose a <span className="gold-text">source</span></h2>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <button key={s.key} type="button" onClick={() => { setKind(s.key); setSelected(null); setItems([]); }}
                className={cn("rounded-full px-3 py-1.5 text-sm ring-1", kind === s.key ? "bg-gold-500 font-semibold text-navy-950 ring-gold-500" : "ring-white/15 hover:text-gold-400")}>{s.label}</button>
            ))}
          </div>
          {needsPicker ? (
            <div className="mt-4">
              {selected && <p className="mb-2 rounded-lg bg-gold-500/10 p-2 text-sm text-gold-400">Selected: <strong>{selected.title}</strong></p>}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title…" className="input pl-9" aria-label="Search source" />
              </div>
              <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-white/10 scrollbar-thin">
                {items.length === 0 && <li className="p-3 text-sm text-muted">No items found.</li>}
                {items.map((it) => (
                  <li key={it.id}>
                    <button type="button" onClick={() => setSelected(it)} className={cn("w-full px-3 py-2 text-left text-sm hover:bg-white/5", selected?.id === it.id && "bg-white/10")}>
                      <span className="line-clamp-1">{it.title}</span><span className="text-xs text-muted">{it.meta}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={8000} className="input mt-4 min-h-32"
              placeholder={kind === "topic" ? "e.g. Why gold traders watch US inflation data" : "Paste your own text (max 8,000 characters)…"} aria-label="Source text" />
          )}
        </section>

        <section className="card-plain space-y-4 p-5">
          <h2 className="font-display text-lg font-bold">2. Content <span className="gold-text">type & options</span></h2>
          <div>
            <label className="label" htmlFor="ctype">Content type</label>
            <select id="ctype" value={contentType} onChange={(e) => setContentType(e.target.value)} className="input">
              {CONTENT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {typeHint && <p className="mt-1 text-xs text-muted">{typeHint}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Sel label="Language" value={opts.language} onChange={(v) => set("language", v)} options={AI_LANGUAGES.map((l) => [l.value, l.label])} />
            <Sel label="Tone" value={opts.tone} onChange={(v) => set("tone", v)} options={TONES.map((t) => [t, t])} />
            <Sel label="Length" value={opts.length} onChange={(v) => set("length", v)} options={LENGTHS.map((t) => [t, t])} />
            <Sel label="Target audience" value={opts.audience} onChange={(v) => set("audience", v)} options={AUDIENCES.map((t) => [t, t])} />
            <Sel label="Platform" value={opts.platform} onChange={(v) => set("platform", v)} options={PLATFORMS.map((t) => [t, t])} />
            {isVideo && <Sel label="Video duration" value={String(opts.duration_seconds)} onChange={(v) => set("duration_seconds", Number(v))} options={DURATIONS.map((d) => [String(d), d >= 120 ? `${d / 60} minutes` : `${d} seconds`])} />}
            {isBanner && <Sel label="Aspect ratio" value={opts.aspect_ratio} onChange={(v) => set("aspect_ratio", v)} options={ASPECT_RATIOS.map((a) => [a, a])} />}
            <div><label className="label" htmlFor="brand">Custom brand name</label><input id="brand" value={opts.brand_name} onChange={(e) => set("brand_name", e.target.value)} maxLength={80} className="input" placeholder="Optional" /></div>
            <div><label className="label" htmlFor="site">Website address</label><input id="site" value={opts.website} onChange={(e) => set("website", e.target.value)} maxLength={120} className="input" placeholder="Optional" /></div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={opts.include_cta} onChange={(e) => set("include_cta", e.target.checked)} className="accent-[var(--primary-gold)]" />Include CTA</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={opts.include_hashtags} onChange={(e) => set("include_hashtags", e.target.checked)} className="accent-[var(--primary-gold)]" />Include hashtags</label>
          </div>
          <div>
            <label className="label" htmlFor="ci">Custom instructions</label>
            <textarea id="ci" value={opts.custom_instructions} onChange={(e) => set("custom_instructions", e.target.value)} maxLength={1000} className="input min-h-20" placeholder="e.g. Mention our Telegram channel, keep under 120 words" />
          </div>
          <button type="button" disabled={!canGenerate} onClick={generate} className="btn-gold h-12 w-full text-lg">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />} {busy ? "Generating…" : "Generate"}
          </button>
          {remaining && <p className="text-center text-xs text-muted">{Math.max(0, remaining.limit - used)} of {remaining.limit} generations left today</p>}
        </section>
      </div>

      <section className="card-navy flex min-h-[500px] flex-col p-5" aria-live="polite">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">3. Your <span className="gold-text">content</span></h2>
          <Link href={adminStudio ? "/admin/ai-studio?history=1" : "/dashboard/history"} className="flex items-center gap-1 text-sm text-white/70 hover:text-gold-400"><History className="size-4" />History</Link>
        </div>
        {err && <p role="alert" className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{err}</p>}
        {gen ? (
          <>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="input min-h-[360px] flex-1 font-mono text-[14px] leading-6"
              dir={opts.language === "ar" || opts.language === "ur" ? "rtl" : undefined} aria-label="Generated content (editable)" />
            <p className="mt-2 text-xs text-muted">Generated by {gen.provider} · {gen.model}. AI can make mistakes — check facts marked [verify] before publishing. Not financial advice.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={generate} disabled={busy} className="btn-outline h-9 px-3 text-sm"><RefreshCw className="size-4" />Regenerate</button>
              <button onClick={copy} className="btn-gold h-9 px-3 text-sm"><Copy className="size-4" />Copy</button>
              <button onClick={save} disabled={saved} className="btn-outline h-9 px-3 text-sm"><Bookmark className="size-4" />{saved ? "Saved" : "Save"}</button>
              {draft !== gen.output && <button onClick={saveEdit} className="btn-outline h-9 px-3 text-sm"><Save className="size-4" />Save edits</button>}
              <button onClick={download} className="btn-outline h-9 px-3 text-sm"><Download className="size-4" />Download .txt</button>
              <button onClick={remove} className="btn-ghost h-9 px-3 text-sm text-red-300"><Trash2 className="size-4" />Delete</button>
            </div>
            {note && <p role="status" className="mt-2 text-sm text-emerald-300">{note}</p>}
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-center text-white/60">
            <div><Sparkles className="mx-auto mb-3 size-10 text-gold-400" />Pick a source and content type, then press Generate.</div>
          </div>
        )}
      </section>
    </div>
  );
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  const id = `sel-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
