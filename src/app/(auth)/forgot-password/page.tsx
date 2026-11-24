"use client";
import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, type FormState } from "../actions";
import { Alert } from "@/components/auth/fields";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  return (
    <form action={action} className="card-navy space-y-4 p-8">
      <h1 className="font-display text-2xl font-bold">Reset your <span className="gold-text">password</span></h1>
      <p className="text-sm text-white/70">Enter your account email and we’ll send a secure reset link.</p>
      {state.error && <Alert>{state.error}</Alert>}
      {state.message && <Alert kind="success">{state.message}</Alert>}
      <input name="email" type="email" required autoComplete="email" className="input" placeholder="you@example.com" aria-label="Email" />
      <button disabled={pending} className="btn-gold h-11 w-full">{pending ? "Sending…" : "Send reset link"}</button>
      <p className="text-center text-sm"><Link href="/login" className="text-gold-400 hover:underline">Back to login</Link></p>
    </form>
  );
}
