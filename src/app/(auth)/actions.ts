"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { env, isSupabaseConfigured } from "@/lib/env";
import { passwordSchema, signInSchema, signUpSchema } from "@/lib/validation/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyBotToken } from "@/lib/security/turnstile";
import { recordServerEvent } from "@/lib/analytics/ingest";
import { safeNextPath } from "@/lib/utils";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { createHash } from "node:crypto";

export interface FormState { ok?: boolean; error?: string; fieldErrors?: Record<string, string>; message?: string }

async function ipKey() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
  return createHash("sha256").update(`${process.env.CRON_SECRET ?? "fxbu"}:${new Date().toISOString().slice(0, 10)}:${ip}`).digest("hex").slice(0, 24);
}

async function registrationSettings() {
  const admin = createSupabaseAdmin();
  const def = DEFAULT_SETTINGS["site.registration"];
  if (!admin) return def;
  const [{ data: s }, { data: flag }] = await Promise.all([
    admin.from("website_settings").select("value").eq("key", "site.registration").maybeSingle(),
    admin.from("feature_flags").select("enabled").eq("key", "registration").maybeSingle(),
  ]);
  const merged = { ...def, ...((s?.value as object) ?? {}) };
  return { ...merged, enabled: merged.enabled && flag?.enabled !== false };
}

function notConfigured(): FormState {
  return { error: "Accounts are not available yet: the database (Supabase) is not configured. See SETUP.md." };
}

export async function signUpAction(_: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return notConfigured();
  if (formData.get("company_website")) return { error: "Registration failed." }; // honeypot
  const settings = await registrationSettings();
  if (!settings.enabled) return { error: "New registrations are temporarily closed." };
  if (!(await rateLimit(`signup:${await ipKey()}`, 3600, 5))) return { error: "Too many sign-up attempts. Please try again later." };
  if (!(await verifyBotToken(formData.get("cf-turnstile-response")?.toString()))) return { error: "Bot verification failed. Please retry." };

  const parsed = signUpSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/confirm?next=/dashboard`,
      data: {
        full_name: d.full_name, phone_country_code: d.phone_country_code, phone: d.phone, country: d.country,
        profession: d.profession, terms_accepted: true, terms_version: settings.terms_version ?? "1.0",
        marketing_consent: d.marketing === "on",
      },
    },
  });
  if (error) {
    if (/password/i.test(error.message)) return { fieldErrors: { password: error.message }, error: error.message };
    if (/rate|limit/i.test(error.message)) return { error: "Too many attempts. Please wait a minute and try again." };
    return { error: "We could not create your account. Please try again." };
  }
  // Supabase returns an obfuscated user with no identities when the email already exists.
  if (data.user && data.user.identities?.length) {
    await recordServerEvent(data.user.id, "registration_completed", { feature: "auth", metadata: { profession: d.profession } });
  }
  if (data.session) redirect("/dashboard"); // email confirmations disabled
  redirect(`/signup/success?email=${encodeURIComponent(d.email)}`);
}

export async function signInAction(_: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return notConfigured();
  const parsed = signInSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { email, password, remember, next } = parsed.data;
  const ip = await ipKey();
  if (!(await rateLimit(`login:${ip}`, 900, 20)) || !(await rateLimit(`login:${email}`, 900, 8))) {
    return { error: "Too many login attempts. Please wait 15 minutes and try again." };
  }
  const jar = await cookies();
  if (remember === "on") jar.delete("fxbu_session_only");
  else jar.set("fxbu_session_only", "1", { httpOnly: true, sameSite: "lax", secure: env.siteUrl.startsWith("https"), path: "/" });

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (/banned/i.test(error?.message ?? "")) return { error: "This account is suspended. Please contact support." };
    if (error?.message?.toLowerCase().includes("email not confirmed")) {
      return { error: "Please verify your email first.", message: `verify:${email}` };
    }
    return { error: "Incorrect email or password." };
  }
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", data.user.id).maybeSingle();
  if (profile?.status === "suspended" || profile?.status === "deleted") {
    await supabase.auth.signOut();
    return { error: "This account is suspended. Please contact support." };
  }
  const settings = await registrationSettings();
  if (settings.require_email_verification && !data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    return { error: "Please verify your email first.", message: `verify:${email}` };
  }
  await recordServerEvent(data.user.id, "login_success", { feature: "auth" });

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const dest = safeNextPath(next, "/dashboard");
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") redirect(`/login/mfa?next=${encodeURIComponent(dest)}`);
  redirect(dest);
}

export async function verifyMfaAction(_: FormState, formData: FormData): Promise<FormState> {
  const code = formData.get("code")?.toString().replace(/\s/g, "") ?? "";
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code from your authenticator app." };
  const supabase = await createSupabaseServer();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.find((f) => f.status === "verified");
  if (!factor) redirect("/dashboard");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { error: "Invalid code. Please try again." };
  redirect(safeNextPath(formData.get("next")?.toString(), "/dashboard"));
}

export async function forgotPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return notConfigured();
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email." };
  if (!(await rateLimit(`reset:${await ipKey()}`, 3600, 5))) return { error: "Too many requests. Please try later." };
  const supabase = await createSupabaseServer();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${env.siteUrl}/auth/confirm?next=/reset-password` });
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const pw = formData.get("password")?.toString() ?? "";
  const confirm = formData.get("confirm_password")?.toString() ?? "";
  const parsed = passwordSchema.safeParse(pw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (pw !== confirm) return { error: "Passwords do not match." };
  const supabase = await createSupabaseServer();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return { error: error.message };
  return { ok: true, message: "Password updated. You can continue to your dashboard." };
}

export async function resendVerificationAction(_: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return notConfigured();
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email." };
  if (!(await rateLimit(`resend:${email}`, 3600, 3))) return { error: "Please wait before requesting another email." };
  const supabase = await createSupabaseServer();
  await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${env.siteUrl}/auth/confirm?next=/dashboard` } });
  return { ok: true, message: "If this email is awaiting verification, a new link has been sent." };
}
