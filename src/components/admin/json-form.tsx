"use client";
/**
 * Structured editor generated from a JSON value: booleans → toggles, numbers → number inputs,
 * hex colours → colour pickers, long strings → textareas, string arrays → comma lists,
 * arrays of objects → repeatable groups. Submits the edited JSON in a hidden "value" field.
 */
import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type J = string | number | boolean | null | J[] | { [k: string]: J };
export interface JState { ok?: boolean; error?: string; message?: string }

const human = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const LONG = new Set(["message", "description", "subtitle", "risk_disclaimer", "about", "privacy", "terms", "disclaimer", "advertise", "default_description", "newsletter_text", "system_instructions"]);

function Editor({ value, onChange, name, path }: { value: J; onChange: (v: J) => void; name: string; path: string }) {
  const id = `j-${path.replace(/[^a-z0-9]/gi, "-")}`;
  if (typeof value === "boolean") {
    return <label className="flex items-center gap-2 text-sm"><input id={id} type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--primary-gold)]" />{human(name)}</label>;
  }
  if (typeof value === "number") {
    return <div><label className="label" htmlFor={id}>{human(name)}</label><input id={id} type="number" step="any" value={value} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} className="input" /></div>;
  }
  if (typeof value === "string" || value === null) {
    const v = value ?? "";
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      return <div><label className="label" htmlFor={id}>{human(name)}</label><div className="flex gap-2"><input type="color" value={v} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-10 w-14 rounded bg-transparent" aria-label={`${human(name)} picker`} /><input id={id} value={v} onChange={(e) => onChange(e.target.value)} className="input" /></div></div>;
    }
    const long = LONG.has(name) || v.length > 90;
    return <div className={long ? "md:col-span-2" : undefined}><label className="label" htmlFor={id}>{human(name)}</label>
      {long ? <textarea id={id} value={v} onChange={(e) => onChange(e.target.value)} className={`input ${v.length > 600 ? "min-h-72" : "min-h-24"}`} />
        : <input id={id} value={v} onChange={(e) => onChange(e.target.value)} className="input" />}</div>;
  }
  if (Array.isArray(value)) {
    const objects = value.length > 0 && typeof value[0] === "object" && value[0] !== null && !Array.isArray(value[0]);
    if (!objects) {
      const nums = value.length > 0 && typeof value[0] === "number";
      return <div className="md:col-span-2"><label className="label" htmlFor={id}>{human(name)} <span className="text-xs text-muted">(comma-separated)</span></label>
        <input id={id} defaultValue={value.join(", ")} onBlur={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (nums ? Number(s) : s)))} className="input" /></div>;
    }
    const template = Object.fromEntries(Object.entries(value[0] as Record<string, J>).map(([k, v]) => [k, typeof v === "boolean" ? true : typeof v === "number" ? 0 : ""]));
    return (
      <div className="md:col-span-2 space-y-3">
        <p className="label">{human(name)}</p>
        {value.map((item, i) => (
          <div key={i} className="relative rounded-lg border border-white/10 p-3">
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute right-2 top-2 text-white/50 hover:text-red-300" aria-label="Remove item"><Trash2 className="size-4" /></button>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(item as Record<string, J>).map(([k, v]) => (
                <Editor key={k} name={k} path={`${path}.${i}.${k}`} value={v} onChange={(nv) => onChange(value.map((x, j) => (j === i ? { ...(x as object), [k]: nv } : x)) as J)} />
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...value, template] as J)} className="btn-outline h-8 px-3 text-xs"><Plus className="size-3.5" />Add item</button>
      </div>
    );
  }
  return (
    <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
      {Object.entries(value).map(([k, v]) => (
        <Editor key={k} name={k} path={`${path}.${k}`} value={v} onChange={(nv) => onChange({ ...(value as object), [k]: nv } as J)} />
      ))}
    </div>
  );
}

export function JsonForm({ initial, action, field = "value", visibility, submit = "Save" }: {
  initial: J; action: (s: JState, fd: FormData) => Promise<JState>; field?: string; visibility?: boolean; submit?: string;
}) {
  const [value, setValue] = useState<J>(initial);
  const [state, formAction, pending] = useActionState<JState, FormData>(action, {});
  const [raw, setRaw] = useState(false);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name={field} value={JSON.stringify(value)} />
      {visibility !== undefined && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_visible" defaultChecked={visibility} className="size-4 accent-[var(--primary-gold)]" />Section visible on the website</label>}
      {raw ? (
        <textarea defaultValue={JSON.stringify(value, null, 2)} onBlur={(e) => { try { setValue(JSON.parse(e.target.value)); } catch { /* keep */ } }} className="input min-h-72 font-mono text-xs" aria-label="Raw JSON" />
      ) : <div className="grid gap-4 md:grid-cols-2"><Editor value={value} onChange={setValue} name="root" path="root" /></div>}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="btn-gold h-10 px-5">{pending ? "Saving…" : submit}</button>
        <button type="button" onClick={() => setRaw((v) => !v)} className="text-xs text-muted underline">{raw ? "Form view" : "Advanced: raw JSON"}</button>
        {state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
        {state.message && <p role="status" className="text-sm text-emerald-300">{state.message}</p>}
      </div>
    </form>
  );
}
