"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPermission, getViewer } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/admin/audit";
import { runJob } from "@/lib/jobs/runner";
import { ingestSource, loadPipelineSettings } from "@/lib/news/ingest";
import { createNotification, type Audience } from "@/lib/admin/notify";
import { env } from "@/lib/env";
import { emailConfigured, escapeHtml, sendEmail } from "@/lib/email";
import { DEFAULT_SETTINGS } from "@/lib/defaults";

export interface AdminState { ok?: boolean; error?: string; message?: string }

/* ---------------- jobs & sources ---------------- */
export async function runSourceNowAction(sourceId: string): Promise<AdminState> {
  await assertPermission("sources.manage");
  const db = createSupabaseAdmin();
  if (!db) return { error: "Service role not configured" };
  const settings = await loadPipelineSettings(db);
  const { data } = await db.rpc("claim_due_sources", { p_limit: 1, p_lock_seconds: 120, p_source: sourceId });
  const src = (data ?? [])[0];
  if (!src) return { error: "Source is locked by a running job. Try again shortly." };
  const r = await ingestSource(db, src, settings, "manual");
  await audit("run_source", "news_sources", sourceId, { status: r.status, inserted: r.inserted });
  revalidatePath(`/admin/r/sources/${sourceId}`);
  return r.status === "failed" ? { error: r.error } : { ok: true, message: `Fetched ${r.fetched}, inserted ${r.inserted} (${r.review} for review), ${r.duplicates} duplicates.` };
}

export async function runJobNowAction(key: string): Promise<AdminState> {
  await assertPermission("jobs.manage");
  const r = await runJob(key, "manual");
  await audit("run_job", "scheduled_jobs", key, { ok: r.ok, skipped: r.skipped ?? false });
  revalidatePath("/admin/jobs");
  if (!r.ok) return { error: r.error };
  return { ok: true, message: r.skipped ? "Job is already running." : `Done: ${JSON.stringify(r.details ?? {}).slice(0, 200)}` };
}

export async function updateJobAction(key: string, enabled: boolean, interval: number): Promise<AdminState> {
  await assertPermission("jobs.manage");
  if (!Number.isInteger(interval) || interval < 1 || interval > 10080) return { error: "Interval must be 1–10080 minutes" };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("scheduled_jobs").update({ enabled, interval_minutes: interval }).eq("key", key);
  if (error) return { error: error.message };
  await audit("update_job", "scheduled_jobs", key, { enabled, interval });
  revalidatePath("/admin/jobs");
  return { ok: true, message: "Saved." };
}

export async function recalcAnalyticsAction(): Promise<AdminState> {
  await assertPermission("analytics.view");
  const r = await runJob("analytics_rollup", "manual");
  return r.ok ? { ok: true, message: "Analytics and rankings recalculated." } : { error: r.error };
}

/* ---------------- settings ---------------- */
const HEX = /^#[0-9a-fA-F]{6}$/;
const SETTING_SCHEMAS: Record<string, z.ZodTypeAny> = {
  "site.general": z.object({ name: z.string().min(2).max(80), tagline: z.string().max(120), domain: z.string().max(120), contact_email: z.string().email(),
    logo_url: z.string().max(500), default_language: z.string().max(10), default_timezone: z.string().max(60) }),
  "site.theme": z.record(z.string(), z.string().regex(HEX, "Colours must be #RRGGBB")),
  "site.registration": z.object({ enabled: z.boolean(), require_email_verification: z.boolean(), terms_version: z.string().max(20) }),
  "site.maintenance": z.object({ enabled: z.boolean(), message: z.string().max(500) }),
  "site.seo": z.object({ default_title: z.string().max(120), default_description: z.string().max(300), og_image: z.string().max(500), twitter_handle: z.string().max(40) }),
  "site.footer": z.object({ description: z.string().max(400), newsletter_title: z.string().max(80), newsletter_text: z.string().max(200), advertise_title: z.string().max(60),
    advertise_text: z.string().max(120), risk_disclaimer: z.string().max(800), copyright_name: z.string().max(80) }),
  "site.legal": z.object({ about: z.string().max(20000), privacy: z.string().max(50000), terms: z.string().max(50000), disclaimer: z.string().max(20000), advertise: z.string().max(5000) }),
  "analytics.tracking": z.object({ enabled: z.boolean(), heartbeat_seconds: z.number().int().min(15).max(120), idle_seconds: z.number().int().min(30).max(1800),
    offline_seconds: z.number().int().min(45).max(600), anonymous_requires_consent: z.boolean(), retention_days: z.number().int().min(7).max(730) }),
  "analytics.engagement_weights": z.record(z.string(), z.number().min(0).max(1000)),
  "content.access": z.object({ guest_preview: z.boolean() }),
  "news.pipeline": z.object({ default_refresh_minutes: z.number().int().min(2).max(1440), max_sources_per_run: z.number().int().min(1).max(50),
    fetch_timeout_ms: z.number().int().min(2000).max(30000), max_items_per_source: z.number().int().min(1).max(100),
    high_risk_keywords: z.array(z.string().max(40)).max(100), hot_keywords: z.array(z.string().max(40)).max(100), similarity_threshold: z.number().min(0.5).max(1) }),
  "automation.daily": z.object({ enabled: z.boolean(), publish_time_utc: z.string().regex(/^\d{2}:\d{2}$/), prompts_count: z.number().int().min(0).max(10),
    scripts_count: z.number().int().min(0).max(10), languages: z.array(z.enum(["en", "ur", "roman_ur", "hi", "ar"])).min(1), categories: z.array(z.string().max(40)),
    durations: z.array(z.number().int()).min(1), auto_generate_drafts: z.boolean(), require_approval: z.boolean(), auto_publish: z.boolean() }),
  "notifications.config": z.object({ email_provider: z.string().max(40), push_provider: z.string().max(40), dedupe_minutes: z.number().int().min(0).max(1440) }),
  "storage.uploads": z.object({ max_upload_mb: z.number().min(1).max(50), allowed_types: z.array(z.string().max(60)) }),
};
const PUBLIC_KEYS = new Set(["site.general", "site.theme", "site.registration", "site.maintenance", "site.seo", "site.footer", "site.legal", "analytics.tracking", "content.access"]);

export async function saveSettingAction(key: string, _: AdminState, fd: FormData): Promise<AdminState> {
  const perm = key === "automation.daily" ? "automation.manage" : key === "news.pipeline" ? "sources.manage" : "settings.manage";
  await assertPermission(perm);
  const schema = SETTING_SCHEMAS[key];
  if (!schema) return { error: "Unknown setting" };
  let value: unknown;
  try { value = JSON.parse(String(fd.get("value") ?? "{}")); } catch { return { error: "Invalid JSON" }; }
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { error: `${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}` };
  const supabase = await createSupabaseServer();
  const viewer = await getViewer();
  const { error } = await supabase.from("website_settings").upsert({ key, value: parsed.data, is_public: PUBLIC_KEYS.has(key), updated_by: viewer?.id });
  if (error) return { error: error.message };
  await audit("update_setting", "website_settings", key, { keys: Object.keys(parsed.data as object) });
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}

export async function saveHomepageSectionAction(key: string, _: AdminState, fd: FormData): Promise<AdminState> {
  await assertPermission("homepage.manage");
  let content: unknown;
  try { content = JSON.parse(String(fd.get("content") ?? "{}")); } catch { return { error: "Invalid JSON content" }; }
  if (!content || typeof content !== "object" || Array.isArray(content)) return { error: "Content must be an object" };
  const s = JSON.stringify(content);
  if (s.length > 20000) return { error: "Content too large" };
  if (/javascript:/i.test(s)) return { error: "javascript: links are not allowed" };
  const supabase = await createSupabaseServer();
  const viewer = await getViewer();
  const { error } = await supabase.from("homepage_sections").update({ content, is_visible: fd.get("is_visible") === "on", updated_by: viewer?.id }).eq("key", key);
  if (error) return { error: error.message };
  await audit("update_homepage", "homepage_sections", key, {});
  revalidatePath("/", "layout");
  return { ok: true, message: "Section saved and published." };
}

/* ---------------- AI settings ---------------- */
const AiSchema = z.object({
  enabled: z.boolean(), member_enabled: z.boolean(),
  active_provider: z.enum(["gemini", "openai", "anthropic", "openai_compatible"]), model: z.string().min(1).max(100),
  fallback_provider: z.enum(["gemini", "openai", "anthropic", "openai_compatible"]).nullable(), fallback_model: z.string().max(100).nullable(),
  temperature: z.number().min(0).max(2), max_output_tokens: z.number().int().min(64).max(16000), default_language: z.enum(["en", "ur", "roman_ur", "hi", "ar"]),
  system_instructions: z.string().max(8000), per_user_daily_limit: z.number().int().min(0).max(10000), global_daily_limit: z.number().int().min(0),
  global_monthly_limit: z.number().int().min(0), timeout_ms: z.number().int().min(2000).max(120000),
  cost_input_per_million: z.number().min(0), cost_output_per_million: z.number().min(0),
});
export async function saveAiSettingsAction(_: AdminState, fd: FormData): Promise<AdminState> {
  await assertPermission("ai.settings");
  const n = (k: string) => Number(fd.get(k));
  const s = (k: string) => (fd.get(k)?.toString().trim() || null);
  const parsed = AiSchema.safeParse({
    enabled: fd.get("enabled") === "on", member_enabled: fd.get("member_enabled") === "on", active_provider: s("active_provider"), model: s("model"),
    fallback_provider: s("fallback_provider"), fallback_model: s("fallback_model"), temperature: n("temperature"), max_output_tokens: n("max_output_tokens"),
    default_language: s("default_language"), system_instructions: fd.get("system_instructions")?.toString() ?? "", per_user_daily_limit: n("per_user_daily_limit"),
    global_daily_limit: n("global_daily_limit"), global_monthly_limit: n("global_monthly_limit"), timeout_ms: n("timeout_ms"),
    cost_input_per_million: n("cost_input_per_million"), cost_output_per_million: n("cost_output_per_million"),
  });
  if (!parsed.success) return { error: `${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}` };
  const supabase = await createSupabaseServer();
  const viewer = await getViewer();
  const { error } = await supabase.from("ai_provider_settings").update({ ...parsed.data, updated_by: viewer?.id, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return { error: error.message };
  await audit("update_ai_settings", "ai_provider_settings", "1", { provider: parsed.data.active_provider, model: parsed.data.model, enabled: parsed.data.enabled });
  revalidatePath("/admin/ai-settings");
  return { ok: true, message: "AI settings saved." };
}

/* ---------------- users ---------------- */
async function userAdmin() {
  const viewer = await assertPermission("users.manage");
  const admin = createSupabaseAdmin();
  if (!admin) throw new Error("Service role not configured");
  return { viewer, admin };
}

export async function setUserStatusAction(userId: string, status: "active" | "suspended", reason?: string): Promise<AdminState> {
  const { viewer, admin } = await userAdmin();
  if (userId === viewer.id) return { error: "You cannot change your own status." };
  const { data: target } = await admin.from("user_roles").select("role_key").eq("user_id", userId);
  if ((target ?? []).some((r) => r.role_key === "super_admin") && !viewer.roles.includes("super_admin")) return { error: "Only a Super Admin can suspend a Super Admin." };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("profiles").update({ status, suspended_reason: status === "suspended" ? (reason ?? "").slice(0, 300) || null : null }).eq("id", userId);
  if (error) return { error: error.message };
  await admin.auth.admin.updateUserById(userId, { ban_duration: status === "suspended" ? "876000h" : "none" });
  await audit(status === "suspended" ? "suspend_user" : "reactivate_user", "profiles", userId, { reason: reason ?? null });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: status === "suspended" ? "User suspended and signed out." : "User reactivated." };
}

export async function bulkUserStatusAction(ids: string[], status: "active" | "suspended"): Promise<AdminState> {
  let done = 0;
  for (const id of ids.slice(0, 100)) { const r = await setUserStatusAction(id, status); if (r.ok) done++; }
  revalidatePath("/admin/users");
  return { ok: true, message: `${done} user(s) updated.` };
}

export async function verifyUserAction(userId: string): Promise<AdminState> {
  const { admin } = await userAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) return { error: error.message };
  await audit("verify_user", "profiles", userId);
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: "Email marked as verified." };
}

export async function resendVerificationAdminAction(userId: string): Promise<AdminState> {
  const { admin } = await userAdmin();
  const { data } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  if (!data?.email) return { error: "User not found" };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.resend({ type: "signup", email: data.email, options: { emailRedirectTo: `${env.siteUrl}/auth/confirm?next=/dashboard` } });
  if (error) return { error: error.message };
  await audit("resend_verification", "profiles", userId);
  return { ok: true, message: "Verification email sent (if the account is unverified)." };
}

export async function sendPasswordResetAction(userId: string): Promise<AdminState> {
  const { admin } = await userAdmin();
  const { data } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  if (!data?.email) return { error: "User not found" };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(data.email, { redirectTo: `${env.siteUrl}/auth/confirm?next=/reset-password` });
  if (error) return { error: error.message };
  await audit("send_password_reset", "profiles", userId);
  return { ok: true, message: "Password reset email sent." };
}

export async function setAiLimitAction(userId: string, limit: number | null): Promise<AdminState> {
  await userAdmin();
  if (limit !== null && (!Number.isInteger(limit) || limit < 0 || limit > 10000)) return { error: "Limit must be 0–10000" };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("profiles").update({ ai_daily_limit: limit }).eq("id", userId);
  if (error) return { error: error.message };
  await audit("set_ai_limit", "profiles", userId, { limit });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: "AI limit saved." };
}

export async function setFeatureAccessAction(userId: string, feature: string, enabled: boolean): Promise<AdminState> {
  const { viewer } = await userAdmin();
  if (!["banner_prompts", "video_scripts", "ai_studio", "saved_content", "notifications"].includes(feature)) return { error: "Unknown feature" };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("user_feature_access").upsert({ user_id: userId, feature_key: feature, enabled, updated_by: viewer.id, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  await audit("set_feature_access", "user_feature_access", userId, { feature, enabled });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function addAdminNoteAction(userId: string, _: AdminState, fd: FormData): Promise<AdminState> {
  const viewer = await assertPermission("users.view");
  const note = fd.get("note")?.toString().trim() ?? "";
  if (!note || note.length > 4000) return { error: "Note must be 1–4000 characters." };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("admin_notes").insert({ user_id: userId, author_id: viewer.id, note });
  if (error) return { error: error.message };
  await audit("add_note", "admin_notes", userId);
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: "Note added." };
}

export async function setRolesAction(userId: string, roles: string[]): Promise<AdminState> {
  const viewer = await assertPermission("roles.manage");
  const supabase = await createSupabaseServer();
  const { data: valid } = await supabase.from("roles").select("key");
  const allowed = new Set((valid ?? []).map((r) => r.key));
  const wanted = new Set(roles.filter((r) => allowed.has(r)));
  wanted.add("member");
  if (userId === viewer.id && viewer.roles.includes("super_admin") && !wanted.has("super_admin")) return { error: "You cannot remove your own Super Admin role." };
  const { data: current } = await supabase.from("user_roles").select("role_key").eq("user_id", userId);
  const have = new Set((current ?? []).map((r) => r.role_key));
  const add = [...wanted].filter((r) => !have.has(r));
  const remove = [...have].filter((r) => !wanted.has(r));
  if (add.length) { const { error } = await supabase.from("user_roles").insert(add.map((r) => ({ user_id: userId, role_key: r, assigned_by: viewer.id }))); if (error) return { error: error.message }; }
  if (remove.length) { const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).in("role_key", remove); if (error) return { error: error.message }; }
  await audit("change_roles", "user_roles", userId, { added: add, removed: remove });
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/staff");
  return { ok: true, message: "Roles updated." };
}

export async function deleteUserAccountAction(userId: string, confirmEmail: string): Promise<AdminState> {
  const { viewer, admin } = await userAdmin();
  if (userId === viewer.id) return { error: "You cannot delete your own account here." };
  const { data } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  if (!data || data.email.toLowerCase() !== confirmEmail.trim().toLowerCase()) return { error: "Type the user's email exactly to confirm." };
  const { data: roles } = await admin.from("user_roles").select("role_key").eq("user_id", userId);
  if ((roles ?? []).some((r) => r.role_key === "super_admin")) return { error: "Super Admin accounts cannot be deleted here." };
  await admin.from("account_requests").update({ status: "completed", processed_by: viewer.id, processed_at: new Date().toISOString() })
    .eq("user_id", userId).eq("request_type", "account_deletion");
  await audit("delete_user", "profiles", userId, {});
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true, message: "Account permanently deleted." };
}

/* ---------------- notifications & campaigns ---------------- */
export async function createNotificationAction(_: AdminState, fd: FormData): Promise<AdminState> {
  await assertPermission("notifications.manage");
  const title = fd.get("title")?.toString().trim() ?? "";
  const body = fd.get("body")?.toString().trim() || null;
  const link = fd.get("link")?.toString().trim() || null;
  const category = fd.get("category")?.toString() ?? "announcement";
  const type = fd.get("audience")?.toString() ?? "all";
  const when = fd.get("scheduled_at")?.toString().trim();
  if (!title || title.length > 160) return { error: "Title is required (max 160 characters)." };
  if (link && !(link.startsWith("/") && !link.startsWith("//"))) return { error: "Link must be an internal path starting with /" };
  if (!["breaking_broker", "trading", "new_prompt", "new_script", "followed_broker", "announcement", "account"].includes(category)) return { error: "Invalid category" };
  let audience: Audience = { type: "all" };
  if (type === "segment") audience = { type: "segment", segment_id: String(fd.get("segment_id") ?? "") };
  if (type === "broker_followers") audience = { type: "broker_followers", broker_id: String(fd.get("broker_id") ?? "") };
  if (type === "market") audience = { type: "market", market: String(fd.get("market") ?? "") };
  const scheduledAt = when ? new Date(`${when}Z`).toISOString() : null;
  const r = await createNotification({ title, body, link, category, audience, scheduledAt, dedupeKey: `manual:${title}:${new Date().toISOString().slice(0, 13)}` });
  if (r.error) return { error: r.error };
  await audit("send_notification", "notifications", r.id ?? null, { audience: type, scheduled: Boolean(scheduledAt) });
  revalidatePath("/admin/notifications");
  return { ok: true, message: scheduledAt ? "Notification scheduled." : `Delivered to ${r.recipients ?? 0} member(s).` };
}

export async function sendCampaignAction(id: string): Promise<AdminState> {
  await assertPermission("newsletter.manage");
  const admin = createSupabaseAdmin();
  if (!admin) return { error: "Service role not configured" };
  const { data: c } = await admin.from("newsletter_campaigns").select("*").eq("id", id).maybeSingle();
  if (!c) return { error: "Campaign not found" };
  if (c.status === "sent") return { error: "Campaign already sent." };
  if (!emailConfigured()) {
    await admin.from("newsletter_campaigns").update({ delivery_log: [{ at: new Date().toISOString(), result: "not sent — email provider not configured / development mode" }] }).eq("id", id);
    return { error: "Email provider is not configured (or development mode). Nothing was sent." };
  }
  let emails: string[] = [];
  if (c.segment_id) {
    const { data: seg } = await admin.from("user_segments").select("rules").eq("id", c.segment_id).maybeSingle();
    const { data: ids } = await admin.rpc("segment_user_ids", { p_rules: seg?.rules ?? {} });
    const userIds = ((ids ?? []) as { user_id: string }[]).map((x) => x.user_id);
    const { data: subs } = await admin.from("newsletter_subscribers").select("email,unsubscribe_token").eq("status", "subscribed").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    emails = (subs ?? []).map((s) => `${s.email}|${s.unsubscribe_token}`);
  } else {
    const { data: subs } = await admin.from("newsletter_subscribers").select("email,unsubscribe_token").eq("status", "subscribed").limit(10000);
    emails = (subs ?? []).map((s) => `${s.email}|${s.unsubscribe_token}`);
  }
  await admin.from("newsletter_campaigns").update({ status: "sending" }).eq("id", id);
  const log: { email: string; sent: boolean; reason?: string }[] = [];
  for (const e of emails) {
    const [email, token] = e.split("|");
    const unsub = `${env.siteUrl}/api/newsletter/unsubscribe?token=${token}`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">${escapeHtml(c.body).replace(/\n/g, "<br>")}<hr><p style="font-size:12px;color:#666">You receive this because you subscribed to FX Broker Updates. <a href="${unsub}">Unsubscribe</a></p></div>`;
    const r = await sendEmail(email, c.subject, html, { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
    log.push({ email: email.replace(/(.).+(@.+)/, "$1***$2"), sent: r.sent, reason: r.reason });
  }
  const sent = log.filter((l) => l.sent).length;
  await admin.from("newsletter_campaigns").update({ status: "sent", sent_at: new Date().toISOString(), recipients: sent, delivery_log: log.slice(0, 500) }).eq("id", id);
  await audit("send_campaign", "newsletter_campaigns", id, { recipients: sent });
  revalidatePath(`/admin/r/campaigns/${id}`);
  return { ok: true, message: `Sent to ${sent} of ${emails.length} subscribers.` };
}

/* ---------------- exports logging helper for reports page ---------------- */
export async function resetSettingAction(key: string): Promise<AdminState> {
  await assertPermission("settings.manage");
  const def = (DEFAULT_SETTINGS as Record<string, unknown>)[key];
  if (!def) return { error: "No default for this setting" };
  const supabase = await createSupabaseServer();
  await supabase.from("website_settings").update({ value: def }).eq("key", key);
  await audit("reset_setting", "website_settings", key);
  revalidatePath("/", "layout");
  return { ok: true, message: "Reset to default." };
}
