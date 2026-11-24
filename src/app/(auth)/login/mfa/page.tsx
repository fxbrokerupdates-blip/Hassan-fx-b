"use client";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { verifyMfaAction, type FormState } from "../../actions";
import { Alert } from "@/components/auth/fields";

function MfaForm() {
  const next = useSearchParams().get("next") ?? "/dashboard";
  const [state, action, pending] = useActionState<FormState, FormData>(verifyMfaAction, {});
  return (
    <form action={action} className="card-navy space-y-4 p-8">
      <h1 className="font-display text-2xl font-bold">Two-factor <span className="gold-text">verification</span></h1>
      <p className="text-sm text-white/70">Enter the 6-digit code from your authenticator app.</p>
      {state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required className="input text-center text-2xl tracking-[0.5em]" aria-label="Authentication code" />
      <button disabled={pending} className="btn-gold h-11 w-full">{pending ? "Verifying…" : "Verify"}</button>
    </form>
  );
}
export default function MfaPage() { return <Suspense><MfaForm /></Suspense>; }
