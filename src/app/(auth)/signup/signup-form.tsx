"use client";
import Link from "next/link";
import Script from "next/script";
import { useActionState, useState } from "react";
import { signUpAction, type FormState } from "../actions";
import { Alert, Field, PasswordInput } from "@/components/auth/fields";
import { COUNTRIES } from "@/lib/countries";
import { PROFESSIONS } from "@/lib/defaults";
import { cn } from "@/lib/utils";

export function SignUpForm({ turnstileKey }: { turnstileKey?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signUpAction, {});
  const [dial, setDial] = useState("+92");
  const fe = state.fieldErrors ?? {};
  const err = (k: string) => fe[k];
  return (
    <form action={action} className="card-navy space-y-4 p-6 sm:p-8" noValidate>
      <div>
        <h1 className="font-display text-2xl font-bold">Create your <span className="gold-text">free account</span></h1>
        <p className="mt-1 text-sm text-white/70">Daily prompts, video scripts, saved content and the AI Creator Studio.</p>
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Full Name" name="full_name" error={err("full_name")}>
        <input id="full_name" name="full_name" autoComplete="name" required maxLength={120} className={cn("input", err("full_name") && "border-red-500")} />
      </Field>
      <Field label="Email Address" name="email" error={err("email")}>
        <input id="email" name="email" type="email" autoComplete="email" required maxLength={200} className={cn("input", err("email") && "border-red-500")} />
      </Field>
      <Field label="WhatsApp / Phone Number" name="phone" error={err("phone") ?? err("phone_country_code")}>
        <div className="flex gap-2">
          <select name="phone_country_code" aria-label="Country code" value={dial} onChange={(e) => setDial(e.target.value)} className="input w-32 shrink-0">
            {[...new Set(COUNTRIES.map((c) => c.dial))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required maxLength={20} placeholder="3001234567"
            className={cn("input", err("phone") && "border-red-500")} />
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country" name="country" error={err("country")}>
          <select id="country" name="country" required defaultValue="" className={cn("input", err("country") && "border-red-500")}
            onChange={(e) => { const c = COUNTRIES.find((x) => x.code === e.target.value); if (c) setDial(c.dial); }}>
            <option value="" disabled>Select country</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Profession" name="profession" error={err("profession")}>
          <select id="profession" name="profession" required defaultValue="" className={cn("input", err("profession") && "border-red-500")}>
            <option value="" disabled>Select profession</option>
            {PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Password" name="password" error={err("password")}><PasswordInput name="password" autoComplete="new-password" showStrength invalid={Boolean(err("password"))} /></Field>
      <Field label="Confirm Password" name="confirm_password" error={err("confirm_password")}><PasswordInput name="confirm_password" autoComplete="new-password" invalid={Boolean(err("confirm_password"))} /></Field>
      <input name="company_website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="terms" required className="mt-1 accent-[var(--primary-gold)]" />
        <span>I accept the <Link href="/terms" target="_blank" className="text-gold-400 underline">Terms & Conditions</Link> and <Link href="/privacy" target="_blank" className="text-gold-400 underline">Privacy Policy</Link>, including first-party activity analytics on this website.</span>
      </label>
      {err("terms") && <p className="-mt-2 text-xs text-red-400">{err("terms")}</p>}
      <label className="flex items-start gap-2 text-sm text-white/80">
        <input type="checkbox" name="marketing" className="mt-1 accent-[var(--primary-gold)]" />
        <span>Optional: send me the FX Broker Updates newsletter and promotional emails. You can unsubscribe anytime.</span>
      </label>
      {turnstileKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={turnstileKey} data-theme="dark" />
        </>
      )}
      <button disabled={pending} className="btn-gold h-11 w-full text-lg">{pending ? "Creating account…" : "Create Account"}</button>
      <p className="text-center text-sm text-white/70">Already have an account? <Link href="/login" className="font-semibold text-gold-400 hover:underline">Login</Link></p>
    </form>
  );
}
