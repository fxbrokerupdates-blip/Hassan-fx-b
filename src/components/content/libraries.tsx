import { listPrompts, listScripts } from "@/lib/data/content";
import { PromptCard } from "@/components/content/prompt-card";
import { ScriptCard } from "@/components/content/script-card";
import { Pagination } from "@/components/news/pagination";
import { ASPECT_RATIOS, DURATIONS, LANGUAGES, PROMPT_CATEGORIES } from "@/lib/defaults";
import { dateParam, flatParams, oneOf, pageNum, str, type RawParams } from "@/lib/params";
import { getViewer } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { durationLabel } from "@/lib/utils";

async function memberClient() {
  if (!isSupabaseConfigured) return { viewer: null, db: null };
  const viewer = await getViewer();
  return { viewer, db: viewer ? await createSupabaseServer() : null };
}

function Select({ name, value, label, options }: { name: string; value?: string; label: string; options: { value: string; label: string }[] }) {
  return (
    <select name={name} defaultValue={value ?? ""} aria-label={label} className="input">
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export async function PromptLibrary({ sp, basePath }: { sp: RawParams; basePath: string }) {
  const { viewer, db } = await memberClient();
  const q = {
    q: str(sp, "q", 80), category: oneOf(sp, "category", PROMPT_CATEGORIES.map((c) => c.value)),
    language: oneOf(sp, "language", LANGUAGES.map((l) => l.value)), aspect: oneOf(sp, "aspect", ASPECT_RATIOS),
    date: dateParam(sp, "date"), page: pageNum(sp), pageSize: 12,
  };
  const res = await listPrompts(q, db);
  return (
    <div className="fx-content-library">
      <form className="card-plain grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" role="search" aria-label="Filter prompts">
        <input name="q" defaultValue={q.q} placeholder="Search prompts…" className="input lg:col-span-2" aria-label="Search prompts" />
        <Select name="category" value={q.category} label="All categories" options={[...PROMPT_CATEGORIES]} />
        <Select name="language" value={q.language} label="All languages" options={[...LANGUAGES]} />
        <Select name="aspect" value={q.aspect} label="Any ratio" options={ASPECT_RATIOS.map((a) => ({ value: a, label: a }))} />
        <div className="flex gap-2"><input type="date" name="date" defaultValue={q.date} className="input" aria-label="Date" /><button className="btn-gold px-4">Go</button></div>
      </form>
      {!viewer && (
        <p className="mt-4 rounded-lg bg-gold-500/10 p-3 text-sm text-gold-400">Preview mode — <a href={`/signup?next=${basePath}`} className="underline">create a free account</a> to view, copy and save complete prompts.</p>
      )}
      {res.items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-white/15 p-12 text-center text-white/70">No prompts published for these filters yet.</p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 fx-prompt-grid">
          {res.items.map((p) => <PromptCard key={p.id} p={p} signedIn={Boolean(viewer)} basePath={basePath} />)}
        </div>
      )}
      <Pagination page={res.page} total={res.total} pageSize={res.pageSize} basePath={basePath} params={flatParams(sp)} />
    </div>
  );
}

export async function ScriptLibrary({ sp, basePath }: { sp: RawParams; basePath: string }) {
  const { viewer, db } = await memberClient();
  const dur = Number(str(sp, "duration", 4));
  const q = {
    q: str(sp, "q", 80), language: oneOf(sp, "language", LANGUAGES.map((l) => l.value)),
    duration: (DURATIONS as readonly number[]).includes(dur) ? dur : undefined, date: dateParam(sp, "date"), page: pageNum(sp), pageSize: 10,
  };
  const res = await listScripts(q, db);
  return (
    <div className="fx-content-library">
      <form className="card-plain grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" role="search" aria-label="Filter scripts">
        <input name="q" defaultValue={q.q} placeholder="Search scripts…" className="input lg:col-span-2" aria-label="Search scripts" />
        <Select name="duration" value={q.duration ? String(q.duration) : undefined} label="Any duration" options={DURATIONS.map((d) => ({ value: String(d), label: durationLabel(d) }))} />
        <Select name="language" value={q.language} label="All languages" options={[...LANGUAGES]} />
        <div className="flex gap-2"><input type="date" name="date" defaultValue={q.date} className="input" aria-label="Date" /><button className="btn-gold px-4">Go</button></div>
      </form>
      {!viewer && (
        <p className="mt-4 rounded-lg bg-gold-500/10 p-3 text-sm text-gold-400">Preview mode — <a href={`/signup?next=${basePath}`} className="underline">create a free account</a> for complete scripts.</p>
      )}
      {res.items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-white/15 p-12 text-center text-white/70">No scripts published for these filters yet.</p>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2 fx-script-grid">{res.items.map((s) => <ScriptCard key={s.id} s={s} basePath={basePath} />)}</div>
      )}
      <Pagination page={res.page} total={res.total} pageSize={res.pageSize} basePath={basePath} params={flatParams(sp)} />
    </div>
  );
}
