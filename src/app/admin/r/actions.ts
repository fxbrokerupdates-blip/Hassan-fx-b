"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { RESOURCES, PK } from "@/lib/admin/resources";
import { buildRecord } from "@/lib/admin/validate";
import { assertPermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { audit, diffKeys } from "@/lib/admin/audit";
import { readingMinutes, slugify } from "@/lib/utils";
import { createNotification } from "@/lib/admin/notify";

export interface SaveState { ok?: boolean; error?: string; errors?: Record<string, string>; message?: string }

function friendly(e: { message?: string; code?: string } | null): string {
  if (!e) return "Unknown error";
  if (e.code === "42501" || /permission/i.test(e.message ?? "")) return e.message?.includes("news.publish") ? "You don't have permission to publish or schedule news." : "You don't have permission for this action.";
  if (e.code === "23505") return "A record with the same unique value (e.g. slug) already exists.";
  if (e.code === "23514") return `Validation failed: ${e.message}`;
  if (e.code === "23503") return "This record is referenced by other data and cannot be changed this way.";
  return e.message ?? "Database error";
}

async function syncTags(articleId: string, tags: string[]) {
  const supabase = await createSupabaseServer();
  await supabase.from("news_article_tags").delete().eq("article_id", articleId);
  for (const name of tags.slice(0, 20)) {
    const slug = slugify(name, 80);
    if (!slug) continue;
    const { data: tag } = await supabase.from("news_tags").upsert({ slug, name }, { onConflict: "slug" }).select("id").single();
    if (tag) await supabase.from("news_article_tags").insert({ article_id: articleId, tag_id: tag.id });
  }
}

export async function saveResourceAction(key: string, id: string | null, _: SaveState, fd: FormData): Promise<SaveState> {
  const resource = RESOURCES[key];
  if (!resource) return { error: "Unknown resource" };
  const viewer = await assertPermission(resource.permission);
  const isNew = !id;
  if (isNew && resource.canCreate === false) return { error: "Records of this type cannot be created here." };
  const { values, extras, errors } = buildRecord(resource, fd, isNew);
  if (Object.keys(errors).length) return { error: "Please fix the highlighted fields.", errors };

  const supabase = await createSupabaseServer();
  const pk = PK[resource.table] ?? "id";
  if (resource.table === "news_articles") {
    if (!values.reading_minutes) values.reading_minutes = readingMinutes(`${values.summary ?? ""} ${values.content ?? ""}`);
    if (isNew) values.author_id = viewer.id;
    if (values.status === "scheduled" && !values.scheduled_at) return { error: "Choose a schedule time.", errors: { scheduled_at: "Required when scheduling" } };
  }
  if ((resource.table === "banner_prompts" || resource.table === "video_scripts") && isNew) values.created_by = viewer.id;
  if (resource.table === "navigation_items" && values.parent_id === id) return { error: "An item cannot be its own parent." };

  let before: Record<string, unknown> | null = null;
  let savedId = id;
  if (isNew) {
    const { data, error } = await supabase.from(resource.table).insert(values).select(pk).single();
    if (error) return { error: friendly(error) };
    savedId = String((data as unknown as Record<string, unknown>)[pk]);
  } else {
    const { data: prev } = await supabase.from(resource.table).select("*").eq(pk, id).maybeSingle();
    before = prev;
    const { error } = await supabase.from(resource.table).update(values).eq(pk, id);
    if (error) return { error: friendly(error) };
  }

  if (resource.table === "news_articles" && savedId) {
    await syncTags(savedId, (extras._tags as string[]) ?? []);
  }
  const becamePublished = values.status === "published" && before?.status !== "published";
  if (fd.get("_notify") === "on" && becamePublished && savedId) {
    await createNotificationForContent(resource.table, savedId, values);
  }
  await audit(isNew ? "create" : becamePublished ? "publish" : "update", resource.table, savedId, diffKeys(before, values));
  revalidatePath(`/admin/r/${key}`);
  revalidatePath("/", "layout");
  if (isNew) redirect(`/admin/r/${key}/${savedId}?saved=1`);
  return { ok: true, message: "Saved." };
}

async function createNotificationForContent(table: string, id: string, v: Record<string, unknown>) {
  if (table === "news_articles") {
    const slug = v.slug as string;
    const isBroker = v.news_type === "broker";
    await createNotification({
      title: String(v.title).slice(0, 160), body: (v.summary as string | null)?.slice(0, 300) ?? null, link: `/news/${slug}`,
      category: isBroker ? (v.broker_id ? "followed_broker" : "breaking_broker") : "trading",
      audience: isBroker && v.broker_id ? { type: "broker_followers", broker_id: v.broker_id } : v.market ? { type: "market", market: v.market } : { type: "all" },
      dedupeKey: `article:${id}`,
    });
  } else if (table === "banner_prompts" || table === "video_scripts") {
    const prompt = table === "banner_prompts";
    await createNotification({
      title: `New daily ${prompt ? "banner prompt" : "video script"}: ${String(v.title).slice(0, 120)}`, body: null,
      link: prompt ? `/dashboard/prompts#prompt-${id}` : `/dashboard/scripts#script-${id}`,
      category: prompt ? "new_prompt" : "new_script", audience: { type: "all" }, dedupeKey: `${table}:${id}`,
    });
  }
}

export async function deleteResourcesAction(key: string, ids: string[]): Promise<SaveState> {
  const resource = RESOURCES[key];
  if (!resource || resource.canDelete === false) return { error: "Not allowed" };
  await assertPermission(resource.deletePermission ?? resource.permission);
  if (!ids.length || ids.length > 200) return { error: "Select 1–200 records." };
  const supabase = await createSupabaseServer();
  const pk = PK[resource.table] ?? "id";
  const { error, count } = await supabase.from(resource.table).delete({ count: "exact" }).in(pk, ids);
  if (error) return { error: friendly(error) };
  await audit("delete", resource.table, ids.length === 1 ? ids[0] : null, { count: count ?? ids.length, ids: ids.slice(0, 20) });
  revalidatePath(`/admin/r/${key}`);
  revalidatePath("/", "layout");
  return { ok: true, message: `Deleted ${count ?? ids.length} record(s).` };
}

export async function bulkStatusAction(key: string, ids: string[], value: string): Promise<SaveState> {
  const resource = RESOURCES[key];
  if (!resource?.bulkStatus) return { error: "Not allowed" };
  await assertPermission(resource.permission);
  if (!resource.bulkStatus.values.some((v) => v.value === value)) return { error: "Invalid status" };
  if (!ids.length || ids.length > 200) return { error: "Select 1–200 records." };
  const supabase = await createSupabaseServer();
  const pk = PK[resource.table] ?? "id";
  const { error, count } = await supabase.from(resource.table).update({ [resource.bulkStatus.field]: value }, { count: "exact" }).in(pk, ids);
  if (error) return { error: friendly(error) };
  await audit(`bulk_${resource.bulkStatus.field}`, resource.table, null, { value, count: count ?? ids.length, ids: ids.slice(0, 20) });
  revalidatePath(`/admin/r/${key}`);
  revalidatePath("/", "layout");
  return { ok: true, message: `Updated ${count ?? ids.length} record(s).` };
}
