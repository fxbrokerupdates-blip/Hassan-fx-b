import type { Field, Resource } from "@/lib/admin/resources";
import { slugify } from "@/lib/utils";

export interface BuildResult { values: Record<string, unknown>; extras: Record<string, unknown>; errors: Record<string, string> }

const URL_RE = /^https?:\/\/[^\s<>"']+$/i;

/** Converts submitted form data into typed column values, validating every field server-side. */
export function buildRecord(resource: Resource, fd: FormData, isNew: boolean): BuildResult {
  const values: Record<string, unknown> = {};
  const extras: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const f of resource.fields) {
    if (f.type === "readonly") continue;
    const raw = fd.get(f.name);
    const str = typeof raw === "string" ? raw.trim() : "";
    const target = f.name.startsWith("_") ? extras : values;
    const fail = (m: string) => { errors[f.name] = m; };
    if (f.max && str.length > f.max) { fail(`Maximum ${f.max} characters`); continue; }
    switch (f.type) {
      case "boolean": target[f.name] = raw === "on"; break;
      case "number": {
        if (!str) { if (f.required) fail("Required"); else target[f.name] = null; break; }
        const n = Number(str);
        if (!Number.isFinite(n)) fail("Must be a number"); else target[f.name] = n;
        break;
      }
      case "select": {
        if (!str) { if (f.required) fail("Required"); else target[f.name] = null; break; }
        if (f.options && !f.options.some((o) => o.value === str)) { fail("Invalid option"); break; }
        target[f.name] = /^\d+$/.test(str) && (f.name.endsWith("_seconds") || f.name === "status_code") ? Number(str) : str;
        break;
      }
      case "relation": {
        if (!str) { if (f.required) fail("Required"); else target[f.name] = null; break; }
        if (!/^[0-9a-f-]{36}$/i.test(str)) { fail("Invalid selection"); break; }
        target[f.name] = str;
        break;
      }
      case "url": case "image": {
        if (!str) { if (f.required) fail("Required"); else target[f.name] = null; break; }
        if (!(URL_RE.test(str) || (f.type === "image" && /^\/[a-zA-Z0-9/_.-]+$/.test(str)))) fail("Enter a valid http(s) URL");
        else target[f.name] = str;
        break;
      }
      case "email": {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str)) fail("Invalid email"); else target[f.name] = str.toLowerCase();
        break;
      }
      case "datetime": {
        if (!str) { target[f.name] = null; if (f.required) fail("Required"); break; }
        const d = new Date(/Z|[+-]\d\d:?\d\d$/.test(str) ? str : `${str}Z`); // datetime-local values are interpreted as UTC
        if (Number.isNaN(d.getTime())) fail("Invalid date/time"); else target[f.name] = d.toISOString();
        break;
      }
      case "date": {
        if (!str) { if (f.required) fail("Required"); else target[f.name] = null; break; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) fail("Invalid date"); else target[f.name] = str;
        break;
      }
      case "tags": {
        const sep = f.name === "key_highlights" ? "|" : ",";
        target[f.name] = str ? str.split(sep).map((t) => t.trim()).filter(Boolean).slice(0, 50) : [];
        break;
      }
      case "json": {
        if (!str) { target[f.name] = f.name === "items" ? [] : {}; break; }
        try { target[f.name] = JSON.parse(str); } catch { fail("Invalid JSON"); }
        break;
      }
      case "slug": {
        const from = f.slugFrom ? String(fd.get(f.slugFrom) ?? "") : "";
        const s = slugify(str || from, 150);
        if (s.length < 2) { if (isNew || str) fail("Could not create a valid slug"); break; }
        target[f.name] = s;
        break;
      }
      default: {
        if (!str) { if (f.required) fail("Required"); else target[f.name] = null; break; }
        target[f.name] = str;
      }
    }
    // Empty optional fields fall back to their declared default (mirrors NOT NULL column defaults).
    if ((target[f.name] === null || target[f.name] === undefined) && f.default !== undefined && !errors[f.name] && f.type !== "boolean") {
      target[f.name] = f.default;
    }
  }
  return { values, extras, errors };
}

/** Formats a stored value for an <input>. Datetimes are shown in UTC. */
export function toInputValue(f: Field, v: unknown): string {
  if (v === null || v === undefined) return f.default !== undefined && typeof f.default !== "boolean" ? String(f.default) : "";
  if (f.type === "datetime") return String(v).slice(0, 16);
  if (f.type === "tags") return Array.isArray(v) ? v.join(f.name === "key_highlights" ? " | " : ", ") : "";
  if (f.type === "json") return JSON.stringify(v, null, 2);
  return String(v);
}
