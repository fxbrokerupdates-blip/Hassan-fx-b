"use client";
import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction, type FormState } from "../actions";
import { Alert, PasswordInput } from "@/components/auth/fields";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});
  return (
    <form action={action} className="card-navy space-y-4 p-8">
      <h1 className="font-display text-2xl font-bold">Choose a new <span className="gold-text">password</span></h1>
      {state.error && <Alert>{state.error}</Alert>}
      {state.ok ? (
        <><Alert kind="success">{state.message}</Alert><Link href="/dashboard" className="btn-gold h-11 w-full">Go to dashboard</Link></>
      ) : (
        <>
          <label className="label" htmlFor="password">New password</label>
          <PasswordInput name="password" autoComplete="new-password" showStrength />
          <label className="label" htmlFor="confirm_password">Confirm password</label>
          <PasswordInput name="confirm_password" autoComplete="new-password" />
          <button disabled={pending} className="btn-gold h-11 w-full">{pending ? "Saving…" : "Update password"}</button>
        </>
      )}
    </form>
  );
}
