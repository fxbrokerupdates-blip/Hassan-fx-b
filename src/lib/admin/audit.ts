import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";

const SENSITIVE = /password|token|secret|key|api/i;

/** Writes an append-only audit entry. Values of sensitive-looking fields are never recorded. */
export async function audit(action: string, resource: string, resourceId: string | null, summary: Record<string, unknown> = {}, result: "success" | "failure" = "success") {
  try {
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(summary)) safe[k] = SENSITIVE.test(k) ? "[redacted]" : typeof v === "string" ? v.slice(0, 300) : v;
    const supabase = await createSupabaseServer();
    await supabase.rpc("log_admin_action", { p_action: action, p_resource: resource, p_resource_id: resourceId, p_summary: safe, p_result: result });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}

/** Shallow diff of changed keys for audit summaries (field names only + short values). */
export function diffKeys(before: Record<string, unknown> | null, after: Record<string, unknown>): Record<string, unknown> {
  const changed: string[] = [];
  for (const [k, v] of Object.entries(after)) {
    if (JSON.stringify(before?.[k] ?? null) !== JSON.stringify(v ?? null)) changed.push(k);
  }
  const out: Record<string, unknown> = { changed };
  if ("status" in after && before?.status !== after.status) out.status = `${before?.status ?? "∅"} → ${after.status}`;
  return out;
}
