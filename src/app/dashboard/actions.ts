"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { passwordSchema, PROFESSION_VALUES } from "@/lib/validation/auth";
import { COUNTRY_CODES } from "@/lib/countries";
import { recordServerEvent } from "@/lib/analytics/ingest";
import { MARKETS } from "@/lib/defaults";

export interface ActionState { ok?: boolean; error?: string; message?: string }

const ProfileSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone_country_code: z.string().regex(/^\+[0-9]{1,4}$/).or(z.literal("")),
  phone: z.string().trim().regex(/^[0-9 ]{5,20}$/).or(z.literal("")),
  country: z.string().refine((c) => c === "" || COUNTRY_CODES.has(c), "Invalid country"),
  profession: z.enum(PROFESSION_VALUES).or(z.literal("")),
  preferred_language: z.enum(["en", "ur", "roman_ur", "hi", "ar"]),
  timezone: z.string().max(60).refine((tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } }, "Invalid time zone"),
});

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireUser();
  const parsed = ProfileSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("profiles").update({
    full_name: d.full_name, phone_country_code: d.phone_country_code || null, phone: d.phone || null, country: d.country || null,
    profession: d.profession || null, preferred_language: d.preferred_language, timezone: d.timezone,
  }).eq("id", viewer.id);
  if (error) return { error: "Could not save profile." };
  await recordServerEvent(viewer.id, "profile_updated", { feature: "profile" });
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function updateAvatarAction(url: string): Promise<ActionState> {
  const viewer = await requireUser();
  if (!/^https:\/\/[^\s]+\/storage\/v1\/object\/public\/avatars\//.test(url)) return { error: "Invalid avatar URL" };
  const supabase = await createSupabaseServer();
  await supabase.from("profiles").update({ avatar_url: url }).eq("id", viewer.id);
  revalidatePath("/dashboard/profile");
  return { ok: true };
}

export async function changeEmailAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("email"));
  const password = fd.get("current_password")?.toString() ?? "";
  if (!email.success) return { error: "Enter a valid email." };
  const supabase = await createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.email) return { error: "Not signed in." };
  // Re-authenticate before changing sensitive account information.
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: u.user.email, password });
  if (authErr) return { error: "Current password is incorrect." };
  const { error } = await supabase.auth.updateUser({ email: email.data });
  if (error) return { error: error.message };
  return { ok: true, message: "Check both your old and new inbox to confirm the change." };
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const current = fd.get("current_password")?.toString() ?? "";
  const next = fd.get("password")?.toString() ?? "";
  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (next !== fd.get("confirm_password")) return { error: "Passwords do not match." };
  const supabase = await createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.email) return { error: "Not signed in." };
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: u.user.email, password: current });
  if (authErr) return { error: "Current password is incorrect." };
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.message };
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true, message: "Password changed. Other sessions were signed out." };
}

export async function signOutOtherSessionsAction(): Promise<ActionState> {
  await requireUser();
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  return error ? { error: error.message } : { ok: true, message: "All other sessions were signed out." };
}

export async function updatePreferencesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireUser();
  const allowed = new Set<string>(MARKETS.map((m) => m.value));
  const markets = fd.getAll("markets").map(String).filter((m) => allowed.has(m));
  const languages = fd.getAll("content_languages").map(String).filter((l) => ["en", "ur", "roman_ur", "hi", "ar"].includes(l));
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("user_preferences").upsert({
    user_id: viewer.id, market_categories: markets, content_languages: languages.length ? languages : ["en"],
  });
  if (error) return { error: "Could not save preferences." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Preferences saved." };
}

export async function updateNotificationPrefsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireUser();
  const keys = ["breaking_broker", "trading", "new_prompt", "new_script", "followed_broker", "announcement", "email_enabled", "push_enabled"] as const;
  const row: Record<string, unknown> = { user_id: viewer.id, updated_at: new Date().toISOString() };
  for (const k of keys) row[k] = fd.get(k) === "on";
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("notification_preferences").upsert(row);
  return error ? { error: "Could not save notification preferences." } : { ok: true, message: "Notification preferences saved." };
}

export async function updatePrivacyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireUser();
  const analytics = fd.get("analytics") === "on";
  const marketing = fd.get("marketing") === "on";
  const supabase = await createSupabaseServer();
  await supabase.from("user_preferences").upsert({ user_id: viewer.id, analytics_consent: analytics });
  await supabase.from("user_consents").insert([
    { user_id: viewer.id, consent_type: "analytics", granted: analytics, source: "settings" },
    { user_id: viewer.id, consent_type: "marketing", granted: marketing, source: "settings" },
  ]);
  return { ok: true, message: "Privacy preferences saved." };
}

export async function requestAccountAction(type: "data_export" | "account_deletion", note?: string): Promise<ActionState> {
  const viewer = await requireUser();
  const supabase = await createSupabaseServer();
  const { data: open } = await supabase.from("account_requests").select("id").eq("user_id", viewer.id).eq("request_type", type).in("status", ["pending", "in_progress"]).maybeSingle();
  if (open) return { ok: true, message: "You already have an open request. We'll be in touch." };
  const { error } = await supabase.from("account_requests").insert({ user_id: viewer.id, request_type: type, user_note: note?.slice(0, 1000) ?? null });
  if (error) return { error: "Could not submit request." };
  return { ok: true, message: type === "account_deletion" ? "Deletion request received. Our team will confirm by email." : "Export request recorded." };
}

export async function markNotificationAction(id: string, opened = false) {
  const viewer = await requireUser();
  const supabase = await createSupabaseServer();
  const now = new Date().toISOString();
  await supabase.from("user_notifications").update(opened ? { read_at: now, opened_at: now } : { read_at: now }).eq("id", id).eq("user_id", viewer.id);
  revalidatePath("/dashboard", "layout");
}

export async function markAllNotificationsAction() {
  const viewer = await requireUser();
  const supabase = await createSupabaseServer();
  await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("user_id", viewer.id).is("read_at", null);
  revalidatePath("/dashboard", "layout");
}

export async function removeSavedAction(id: string) {
  const viewer = await requireUser();
  const supabase = await createSupabaseServer();
  await supabase.from("saved_content").delete().eq("id", id).eq("user_id", viewer.id);
  revalidatePath("/dashboard/saved");
}

export async function createCollectionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireUser();
  const name = fd.get("name")?.toString().trim() ?? "";
  if (!name || name.length > 60) return { error: "Collection name must be 1–60 characters." };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("user_collections").insert({ user_id: viewer.id, name });
  if (error) return { error: error.code === "23505" ? "You already have a collection with that name." : "Could not create collection." };
  revalidatePath("/dashboard/saved");
  return { ok: true };
}

export async function deleteCollectionAction(id: string) {
  const viewer = await requireUser();
  const supabase = await createSupabaseServer();
  await supabase.from("user_collections").delete().eq("id", id).eq("user_id", viewer.id);
  revalidatePath("/dashboard/saved");
}

export async function setCollectionAction(savedId: string, collectionId: string | null) {
  const viewer = await requireUser();
  const supabase = await createSupabaseServer();
  const { data: owned } = await supabase.from("saved_content").select("id").eq("id", savedId).eq("user_id", viewer.id).maybeSingle();
  if (!owned) return;
  await supabase.from("collection_items").delete().eq("saved_id", savedId);
  if (collectionId) await supabase.from("collection_items").insert({ collection_id: collectionId, saved_id: savedId });
  revalidatePath("/dashboard/saved");
}

export async function toggleBrokerNotifyAction(brokerId: string, notify: boolean) {
  const viewer = await requireUser();
  const supabase = await createSupabaseServer();
  await supabase.from("favourite_brokers").update({ notify }).eq("user_id", viewer.id).eq("broker_id", brokerId);
  revalidatePath("/dashboard/brokers");
}

export async function deleteGenerationAction(id: string) {
  const viewer = await requireUser();
  const supabase = await createSupabaseServer();
  await supabase.from("saved_content").delete().eq("user_id", viewer.id).eq("content_type", "ai_generation").eq("content_id", id);
  await supabase.from("ai_generations").delete().eq("id", id).eq("user_id", viewer.id);
  revalidatePath("/dashboard/history");
}

export async function updateGenerationAction(id: string, output: string): Promise<ActionState> {
  const viewer = await requireUser();
  if (output.length > 40_000) return { error: "Content is too long." };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("ai_generations").update({ output }).eq("id", id).eq("user_id", viewer.id);
  return error ? { error: "Could not save edit." } : { ok: true, message: "Saved." };
}
