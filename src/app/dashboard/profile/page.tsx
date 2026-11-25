import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/member/form-action";
import { AvatarUpload } from "@/components/member/avatar-upload";
import { updateProfileAction, changeEmailAction } from "@/app/dashboard/actions";
import { COUNTRIES } from "@/lib/countries";
import { LANGUAGES, PROFESSIONS } from "@/lib/defaults";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My Profile" };
const ZONES = ["UTC", "Asia/Karachi", "Asia/Dubai", "Asia/Kolkata", "Asia/Kuala_Lumpur", "Asia/Singapore", "Asia/Riyadh", "Europe/London", "Europe/Berlin",
  "Africa/Lagos", "Africa/Johannesburg", "America/New_York", "America/Chicago", "America/Los_Angeles", "Australia/Sydney"];

export default async function ProfilePage() {
  const viewer = await requireUser();
  const p = viewer.profile!;
  return (
    <div className="max-w-3xl space-y-6 fx-member-account">
      <h2 className="font-display text-2xl font-bold">My <span className="gold-text">Profile</span></h2>
      <section className="card-plain space-y-5 p-6">
        <AvatarUpload userId={viewer.id} current={p.avatar_url} name={p.full_name || "M"} />
        <ActionForm action={updateProfileAction} submit="Save profile" className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label" htmlFor="full_name">Full name</label><input id="full_name" name="full_name" defaultValue={p.full_name} required maxLength={120} className="input" /></div>
          <div><label className="label" htmlFor="phone_country_code">Country code</label>
            <select id="phone_country_code" name="phone_country_code" defaultValue={p.phone_country_code ?? ""} className="input"><option value="">—</option>
              {[...new Set(COUNTRIES.map((c) => c.dial))].map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
          <div><label className="label" htmlFor="phone">Phone / WhatsApp</label><input id="phone" name="phone" defaultValue={p.phone ?? ""} maxLength={20} className="input" /></div>
          <div><label className="label" htmlFor="country">Country</label>
            <select id="country" name="country" defaultValue={p.country ?? ""} className="input"><option value="">—</option>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
          <div><label className="label" htmlFor="profession">Profession</label>
            <select id="profession" name="profession" defaultValue={p.profession ?? ""} className="input"><option value="">—</option>{PROFESSIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div><label className="label" htmlFor="preferred_language">Preferred language</label>
            <select id="preferred_language" name="preferred_language" defaultValue={p.preferred_language} className="input">{LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
          <div><label className="label" htmlFor="timezone">Time zone</label>
            <select id="timezone" name="timezone" defaultValue={p.timezone} className="input">{[...new Set([p.timezone, ...ZONES])].map((z) => <option key={z}>{z}</option>)}</select></div>
          <p className="text-xs text-muted sm:col-span-2">Member since {formatDate(p.created_at)} · Email {p.email_verified_at ? "verified" : "not verified"}</p>
        </ActionForm>
      </section>
      <section className="card-plain p-6">
        <h3 className="mb-1 font-display text-lg font-bold">Email address</h3>
        <p className="mb-4 text-sm text-muted">Current: {p.email}. For security we ask for your password and send confirmation to both addresses.</p>
        <ActionForm action={changeEmailAction} submit="Change email" className="grid gap-3 sm:grid-cols-2">
          <input name="email" type="email" required placeholder="New email" className="input" aria-label="New email" />
          <input name="current_password" type="password" required placeholder="Current password" autoComplete="current-password" className="input" aria-label="Current password" />
        </ActionForm>
      </section>
    </div>
  );
}
