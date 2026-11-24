import "server-only";
import type { Resource } from "@/lib/admin/resources";
import { createSupabaseServer } from "@/lib/supabase/server";

export type Options = Record<string, { value: string; label: string }[]>;

/** Loads select options for relation fields (max 500 each). "staff" lists active staff members. */
export async function loadRelationOptions(resource: Resource): Promise<Options> {
  const supabase = await createSupabaseServer();
  const out: Options = {};
  await Promise.all(resource.fields.filter((f) => f.type === "relation" && f.relation).map(async (f) => {
    const rel = f.relation!;
    if (rel.table === "staff") {
      const { data } = await supabase.from("user_roles").select("user_id, roles!inner(is_staff), profiles!user_roles_user_id_fkey(full_name,email)").eq("roles.is_staff", true).limit(500);
      const rows = (data ?? []) as unknown as { user_id: string; profiles: { full_name: string; email: string } | null }[];
      const seen = new Set<string>();
      out[f.name] = rows.filter((r) => !seen.has(r.user_id) && seen.add(r.user_id)).map((r) => ({ value: r.user_id, label: r.profiles?.full_name || r.profiles?.email || r.user_id }));
      return;
    }
    let q = supabase.from(rel.table).select(`id,${rel.label}`);
    for (const [k, v] of Object.entries(rel.filter ?? {})) q = q.eq(k, v);
    const orderCol = rel.table === "news_articles" ? "published_at" : rel.label;
    const { data } = await q.order(orderCol, { ascending: rel.table !== "news_articles" }).limit(500);
    out[f.name] = ((data ?? []) as unknown as Record<string, string>[]).map((r) => ({ value: r.id, label: String(r[rel.label] ?? r.id).slice(0, 120) }));
  }));
  return out;
}
