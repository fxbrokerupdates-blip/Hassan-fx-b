import { requireUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ActionForm } from "@/components/member/form-action";
import { AccountRequests, MfaPanel, SessionsPanel } from "@/components/member/security-panel";
import { changePasswordAction, updateNotificationPrefsAction, updatePreferencesAction, updatePrivacyAction } from "@/app/dashboard/actions";
import { LANGUAGES, MARKETS } from "@/lib/defaults";

export const metadata = { title: "Settings" };

function Toggle({ name, label, checked, hint }: { name: string; label: string; checked: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 rounded-lg bg-white/[0.03] p-3">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-1 size-4 accent-[var(--primary-gold)]" />
      <span><span className="block text-sm font-medium">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
    </label>
  );
}

export default async function SettingsPage() {
  const viewer = await requireUser();
  const supabase = await createSupabaseServer();
  const [{ data: prefs }, { data: np }, { data: consent }] = await Promise.all([
    supabase.from("user_preferences").select("*").eq("user_id", viewer.id).maybeSingle(),
    supabase.from("notification_preferences").select("*").eq("user_id", viewer.id).maybeSingle(),
    supabase.from("user_consents").select("granted").eq("user_id", viewer.id).eq("consent_type", "marketing").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const markets: string[] = prefs?.market_categories ?? [];
  const langs: string[] = prefs?.content_languages ?? ["en"];
  const n = np ?? {};
  return (
    <div className="max-w-3xl space-y-6 fx-member-settings">
      <h2 className="font-display text-2xl font-bold">Account <span className="gold-text">Settings</span></h2>

      <section id="preferences" className="card-plain p-6">
        <h3 className="mb-3 font-display text-lg font-bold">Market preferences</h3>
        <ActionForm action={updatePreferencesAction}>
          <fieldset><legend className="label">Markets that personalize your dashboard</legend>
            <div className="grid gap-2 sm:grid-cols-3">{MARKETS.map((m) => (
              <label key={m.value} className="flex items-center gap-2 text-sm"><input type="checkbox" name="markets" value={m.value} defaultChecked={markets.includes(m.value)} className="accent-[var(--primary-gold)]" />{m.label}</label>
            ))}</div></fieldset>
          <fieldset><legend className="label">Content languages</legend>
            <div className="flex flex-wrap gap-4">{LANGUAGES.map((l) => (
              <label key={l.value} className="flex items-center gap-2 text-sm"><input type="checkbox" name="content_languages" value={l.value} defaultChecked={langs.includes(l.value)} className="accent-[var(--primary-gold)]" />{l.label}</label>
            ))}</div></fieldset>
        </ActionForm>
      </section>

      <section id="notifications" className="card-plain p-6">
        <h3 className="mb-3 font-display text-lg font-bold">Notification preferences</h3>
        <ActionForm action={updateNotificationPrefsAction}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle name="breaking_broker" label="Breaking broker news" checked={n.breaking_broker ?? true} />
            <Toggle name="trading" label="Important trading news" checked={n.trading ?? true} />
            <Toggle name="new_prompt" label="New daily banner prompts" checked={n.new_prompt ?? true} />
            <Toggle name="new_script" label="New daily video scripts" checked={n.new_script ?? true} />
            <Toggle name="followed_broker" label="Followed broker updates" checked={n.followed_broker ?? true} />
            <Toggle name="announcement" label="Platform announcements" checked={n.announcement ?? true} />
            <Toggle name="email_enabled" label="Email notifications" checked={n.email_enabled ?? false} hint="Delivered when an email provider is configured" />
            <Toggle name="push_enabled" label="Browser push notifications" checked={n.push_enabled ?? false} hint="Requires browser permission" />
          </div>
        </ActionForm>
      </section>

      <section id="privacy" className="card-plain p-6">
        <h3 className="mb-1 font-display text-lg font-bold">Privacy</h3>
        <p className="mb-3 text-sm text-muted">We measure activity on FX Broker Updates only (pages, feature usage, estimated active time). Turning this off stops linking activity to your account.</p>
        <ActionForm action={updatePrivacyAction}>
          <Toggle name="analytics" label="Allow personal activity analytics" checked={prefs?.analytics_consent !== false} hint="Used for your engagement statistics and to improve the site" />
          <Toggle name="marketing" label="Marketing emails & newsletter" checked={consent?.granted ?? false} />
        </ActionForm>
      </section>

      <section className="card-plain space-y-4 p-6">
        <h3 className="font-display text-lg font-bold">Security</h3>
        <ActionForm action={changePasswordAction} submit="Change password" className="grid gap-3 sm:grid-cols-3">
          <input name="current_password" type="password" autoComplete="current-password" required placeholder="Current password" className="input" aria-label="Current password" />
          <input name="password" type="password" autoComplete="new-password" required placeholder="New password" className="input" aria-label="New password" />
          <input name="confirm_password" type="password" autoComplete="new-password" required placeholder="Confirm new password" className="input" aria-label="Confirm password" />
        </ActionForm>
        <div><p className="label">Two-factor authentication</p><MfaPanel /></div>
        <div><p className="label">Active sessions</p><SessionsPanel /></div>
      </section>

      <section className="card-plain p-6">
        <h3 className="mb-3 font-display text-lg font-bold">Your data</h3>
        <AccountRequests />
      </section>
    </div>
  );
}
