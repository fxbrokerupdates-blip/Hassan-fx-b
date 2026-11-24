import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { ingestSource, loadPipelineSettings } from "@/lib/news/ingest";
import { runDailyAutomation } from "@/lib/jobs/automation";

type Handler = (trigger: "schedule" | "manual") => Promise<Record<string, unknown>>;

const handlers: Record<string, Handler> = {
  async news_refresh(trigger) {
    const db = createSupabaseAdmin()!;
    const settings = await loadPipelineSettings(db);
    const { data: due } = await db.rpc("claim_due_sources", { p_limit: settings.max_sources_per_run, p_lock_seconds: 180 });
    const results = [];
    for (const s of (due ?? []) as Parameters<typeof ingestSource>[1][]) results.push(await ingestSource(db, s, settings, trigger));
    return { sources: results.length, inserted: results.reduce((a, r) => a + r.inserted, 0), failed: results.filter((r) => r.status === "failed").length };
  },
  async publish_scheduled() {
    const { data } = await createSupabaseAdmin()!.rpc("publish_due_content");
    return (data ?? {}) as Record<string, unknown>;
  },
  async presence_prune() {
    const db = createSupabaseAdmin()!;
    const { data: s } = await db.from("website_settings").select("value").eq("key", "analytics.tracking").maybeSingle();
    const { data } = await db.rpc("analytics_prune_presence", { p_offline_seconds: Number((s?.value as { offline_seconds?: number })?.offline_seconds ?? 150) });
    return { removed: data };
  },
  async notifications_dispatch() {
    const db = createSupabaseAdmin()!;
    const { data } = await db.from("notifications").select("id").eq("status", "scheduled").lte("scheduled_at", new Date().toISOString()).limit(20);
    let delivered = 0;
    for (const n of data ?? []) { const { data: c } = await db.rpc("deliver_notification", { p_notification: n.id }); delivered += Number(c ?? 0); }
    return { notifications: data?.length ?? 0, delivered };
  },
  async analytics_rollup() {
    const db = createSupabaseAdmin()!;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await db.rpc("analytics_rollup_day", { p_day: today });
    const { data: n } = await db.rpc("refresh_engagement_scores");
    return { rollup: data, scored: n };
  },
  async analytics_daily() {
    const db = createSupabaseAdmin()!;
    const y = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    await db.rpc("analytics_rollup_day", { p_day: y });
    await db.rpc("refresh_engagement_scores");
    await db.rpc("compute_retention_cohorts", { p_type: "week", p_count: 8 });
    await db.rpc("compute_retention_cohorts", { p_type: "month", p_count: 6 });
    return { day: y };
  },
  async analytics_purge() {
    const db = createSupabaseAdmin()!;
    const { data: s } = await db.from("website_settings").select("value").eq("key", "analytics.tracking").maybeSingle();
    const days = Number((s?.value as { retention_days?: number })?.retention_days ?? 90);
    const { data } = await db.rpc("purge_analytics", { p_event_days: days });
    return { retention_days: days, ...(data as object) };
  },
  async daily_content(trigger) {
    return runDailyAutomation(trigger === "manual");
  },
};

export const JOB_KEYS = Object.keys(handlers);

/** Runs a job with a database lock (no overlapping runs across instances) and logs the execution. */
export async function runJob(key: string, trigger: "schedule" | "manual" = "schedule"): Promise<{ ok: boolean; skipped?: boolean; details?: Record<string, unknown>; error?: string }> {
  const db = createSupabaseAdmin();
  if (!db) return { ok: false, error: "Service role not configured" };
  const handler = handlers[key];
  if (!handler) return { ok: false, error: "Unknown job" };
  const { data: locked } = await db.rpc("try_lock_job", { p_key: key, p_seconds: 300, p_force: trigger === "manual" });
  if (!locked) return { ok: true, skipped: true };
  const { data: log } = await db.from("job_execution_logs").insert({ job_key: key, trigger }).select("id").single();
  try {
    const details = await handler(trigger);
    await db.from("job_execution_logs").update({ finished_at: new Date().toISOString(), status: "success", details }).eq("id", log?.id ?? 0);
    await db.rpc("release_job", { p_key: key, p_status: "success", p_error: null });
    return { ok: true, details };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from("job_execution_logs").update({ finished_at: new Date().toISOString(), status: "failed", details: { error: msg } }).eq("id", log?.id ?? 0);
    await db.rpc("release_job", { p_key: key, p_status: "failed", p_error: msg });
    await db.from("system_error_logs").insert({ source: `job:${key}`, message: msg.slice(0, 1000) });
    return { ok: false, error: msg };
  }
}

/** Runs every due job (used by the scheduler endpoint). */
export async function runDueJobs(only?: string[]) {
  const db = createSupabaseAdmin();
  if (!db) return [];
  const { data } = await db.from("scheduled_jobs").select("key").eq("enabled", true).lte("next_run_at", new Date().toISOString());
  const keys = (data ?? []).map((j) => j.key).filter((k) => !only || only.includes(k));
  const out = [];
  for (const k of keys) out.push({ key: k, ...(await runJob(k, "schedule")) });
  return out;
}
