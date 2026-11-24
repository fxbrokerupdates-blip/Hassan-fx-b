"use client";
import { useActionState } from "react";
import type { ActionState } from "@/app/dashboard/actions";

/** Generic form wrapper for server actions returning {ok,error,message}. */
export function ActionForm({ action, children, submit = "Save", className }: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>; children: React.ReactNode; submit?: string; className?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  return (
    <form action={formAction} className={className ?? "space-y-4"}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="btn-gold h-10 px-5">{pending ? "Saving…" : submit}</button>
        {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
        {state.message && <p role="status" className="text-sm text-emerald-400">{state.message}</p>}
      </div>
    </form>
  );
}
