"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type FormState } from "../actions";
import { Alert, Field, PasswordInput } from "@/components/auth/fields";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, {});
  const verifyEmail = state.message?.startsWith("verify:") ? state.message.slice(7) : null;
  return (
    <form action={action} className="card-navy space-y-4 p-6 sm:p-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Welcome <span className="gold-text">back</span></h1>
        <p className="mt-1 text-sm text-white/70">Log in to your FX Broker Updates account.</p>
      </div>
      {notice && <Alert kind="info">{notice}</Alert>}
      {state.error && <Alert>{state.error}{verifyEmail && <> <Link className="underline" href={`/verify-email?email=${encodeURIComponent(verifyEmail)}`}>Resend verification email</Link></>}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" name="email"><input id="email" name="email" type="email" autoComplete="email" required maxLength={200} className="input" /></Field>
      <Field label="Password" name="password"><PasswordInput name="password" autoComplete="current-password" /></Field>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="remember" defaultChecked className="accent-[var(--primary-gold)]" />Remember me</label>
        <Link href="/forgot-password" className="text-gold-400 hover:underline">Forgot password?</Link>
      </div>
      <button disabled={pending} className="btn-gold h-11 w-full text-lg">{pending ? "Logging in…" : "Login"}</button>
      <p className="text-center text-sm text-white/70">New here? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-gold-400 hover:underline">Create Account</Link></p>
    </form>
  );
}
