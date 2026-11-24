"use client";
import { useActionState } from "react";
import type { Field } from "@/lib/admin/resources";
import type { SaveState } from "@/app/admin/r/actions";
import { ImageField } from "@/components/admin/image-field";
import { cn } from "@/lib/utils";

export interface FormField extends Field { value: string; checked?: boolean; relOptions?: { value: string; label: string }[] }

export function ResourceForm({ action, fields, extra, notifyOption, submitLabel = "Save" }: {
  action: (s: SaveState, fd: FormData) => Promise<SaveState>; fields: FormField[]; extra?: React.ReactNode; notifyOption?: boolean; submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(action, {});
  const sections = [...new Set(fields.map((f) => f.section ?? "Details"))];
  return (
    <form action={formAction} className="space-y-6">
      {state.error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{state.error}</p>}
      {state.message && <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{state.message}</p>}
      {sections.map((s) => (
        <fieldset key={s} className="card-plain grid gap-4 p-5 md:grid-cols-2">
          <legend className="px-1 font-display text-sm font-bold uppercase tracking-wide text-gold-400">{s}</legend>
          {fields.filter((f) => (f.section ?? "Details") === s).map((f) => {
            const id = `f-${f.name}`;
            const err = state.errors?.[f.name];
            const wide = f.wide || ["textarea", "markdown", "json"].includes(f.type);
            return (
              <div key={f.name} className={cn(wide && "md:col-span-2")}>
                {f.type !== "boolean" && <label className="label" htmlFor={id}>{f.label}{f.required && <span className="text-gold-400"> *</span>}</label>}
                {f.type === "boolean" ? (
                  <label className="flex items-center gap-2 pt-6 text-sm"><input id={id} type="checkbox" name={f.name} defaultChecked={f.checked} className="size-4 accent-[var(--primary-gold)]" />{f.label}</label>
                ) : f.type === "readonly" ? (
                  <div className="whitespace-pre-wrap rounded-lg bg-white/5 px-3 py-2 text-sm text-white/85">{f.value || "—"}</div>
                ) : f.type === "select" || f.type === "relation" ? (
                  <select id={id} name={f.name} defaultValue={f.value} className="input" aria-invalid={Boolean(err) || undefined}>
                    <option value="">{f.required ? "Select…" : "— none —"}</option>
                    {(f.type === "relation" ? f.relOptions ?? [] : f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "textarea" || f.type === "markdown" || f.type === "json" ? (
                  <textarea id={id} name={f.name} defaultValue={f.value} maxLength={f.max} aria-invalid={Boolean(err) || undefined}
                    className={cn("input", f.type === "json" ? "min-h-40 font-mono text-xs" : f.type === "markdown" ? "min-h-72" : "min-h-28")} />
                ) : f.type === "image" ? (
                  <ImageField id={id} name={f.name} defaultValue={f.value} />
                ) : (
                  <input id={id} name={f.name} defaultValue={f.value} maxLength={f.max} required={f.required && f.type !== "slug"}
                    type={f.type === "number" ? "number" : f.type === "datetime" ? "datetime-local" : f.type === "date" ? "date" : f.type === "url" ? "url" : f.type === "email" ? "email" : "text"}
                    step={f.type === "number" ? "any" : undefined} className="input" aria-invalid={Boolean(err) || undefined} />
                )}
                {f.help && <p className="mt-1 text-xs text-muted">{f.help}</p>}
                {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
              </div>
            );
          })}
        </fieldset>
      ))}
      {extra}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-4 border-t border-white/10 bg-navy-950/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <button disabled={pending} className="btn-gold h-11 px-6">{pending ? "Saving…" : submitLabel}</button>
        {notifyOption && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="_notify" className="accent-[var(--primary-gold)]" />Send in-app notification when this is first published</label>
        )}
        <span className="text-xs text-muted">All date/time fields are in UTC.</span>
      </div>
    </form>
  );
}
