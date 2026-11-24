"use client";
import { useActionState } from "react";
import { resendVerificationAction, type FormState } from "../actions";
import { Alert } from "@/components/auth/fields";

export function ResendForm({ email, invalid }: { email?: string; invalid?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resendVerificationAction, {});
  return (
    <form action={action} className="card-navy space-y-4 p-8">
      <h1 className="font-display text-2xl font-bold">Verify your <span className="gold-text">email</span></h1>
      {invalid && <Alert>That verification link is invalid or has expired. Request a new one below.</Alert>}
      {state.error && <Alert>{state.error}</Alert>}
      {state.message && <Alert kind="success">{state.message}</Alert>}
      <input name="email" type="email" defaultValue={email} required className="input" placeholder="Your email" aria-label="Email" />
      <button disabled={pending} className="btn-gold h-11 w-full">{pending ? "Sending…" : "Resend verification email"}</button>
    </form>
  );
}
