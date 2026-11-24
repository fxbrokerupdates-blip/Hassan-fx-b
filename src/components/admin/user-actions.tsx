"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addAdminNoteAction, deleteUserAccountAction, resendVerificationAdminAction, sendPasswordResetAction, setAiLimitAction,
  setFeatureAccessAction, setRolesAction, setUserStatusAction, verifyUserAction, type AdminState,
} from "@/app/admin/actions";

function useRun() {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<AdminState>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    start(async () => { const r = await fn(); setMsg({ ok: !r.error, t: r.error ?? r.message ?? "Done" }); router.refresh(); });
  };
  return { msg, pending, run };
}

export function UserActions({ userId, status, verified, aiLimit, features, canManage }: {
  userId: string; status: string; verified: boolean; aiLimit: number | null; features: Record<string, boolean>; canManage: boolean;
}) {
  const { msg, pending, run } = useRun();
  const [limit, setLimit] = useState(aiLimit === null ? "" : String(aiLimit));
  if (!canManage) return <p className="text-sm text-muted">You can view this profile but not change it.</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {status === "suspended" ? (
          <button disabled={pending} onClick={() => run(() => setUserStatusAction(userId, "active"), "Reactivate this account?")} className="btn-gold h-9 px-3 text-sm">Reactivate</button>
        ) : (
          <button disabled={pending} onClick={() => { const reason = prompt("Reason for suspension (internal):"); if (reason !== null) run(() => setUserStatusAction(userId, "suspended", reason)); }} className="btn-danger h-9 px-3 text-sm">Suspend</button>
        )}
        {!verified && <button disabled={pending} onClick={() => run(() => verifyUserAction(userId), "Mark this email as verified without the user clicking the link?")} className="btn-outline h-9 px-3 text-sm">Verify email</button>}
        {!verified && <button disabled={pending} onClick={() => run(() => resendVerificationAdminAction(userId))} className="btn-outline h-9 px-3 text-sm">Resend verification</button>}
        <button disabled={pending} onClick={() => run(() => sendPasswordResetAction(userId), "Send a password reset email to this user?")} className="btn-outline h-9 px-3 text-sm">Send password reset</button>
      </div>
      <div>
        <p className="label">Daily AI generation limit</p>
        <div className="flex gap-2"><input value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="numeric" placeholder="Default" className="input w-32" aria-label="AI limit" />
          <button disabled={pending} onClick={() => run(() => setAiLimitAction(userId, limit === "" ? null : Number(limit)))} className="btn-outline h-10 px-3 text-sm">Save</button></div>
        <p className="mt-1 text-xs text-muted">Leave empty to use the global per-user limit.</p>
      </div>
      <div>
        <p className="label">Feature access</p>
        <div className="space-y-1">{Object.entries(features).map(([k, v]) => (
          <label key={k} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" defaultChecked={v} className="accent-[var(--primary-gold)]"
            onChange={(e) => run(() => setFeatureAccessAction(userId, k, e.target.checked))} />{k.replace(/_/g, " ")}</label>
        ))}</div>
      </div>
      <div className="border-t border-white/10 pt-3">
        <button disabled={pending} onClick={() => { const email = prompt("Permanently delete this account and all personal data. Type the user's email to confirm:"); if (email) run(() => deleteUserAccountAction(userId, email)); }}
          className="text-sm text-red-300 hover:underline">Delete account permanently…</button>
      </div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.t}</p>}
    </div>
  );
}

export function RoleEditor({ userId, roles, current }: { userId: string; roles: { key: string; name: string }[]; current: string[] }) {
  const { msg, pending, run } = useRun();
  const [sel, setSel] = useState(new Set(current));
  return (
    <div>
      <div className="grid gap-1 sm:grid-cols-2">{roles.filter((r) => r.key !== "member").map((r) => (
        <label key={r.key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sel.has(r.key)} className="accent-[var(--primary-gold)]"
          onChange={(e) => { const n = new Set(sel); if (e.target.checked) n.add(r.key); else n.delete(r.key); setSel(n); }} />{r.name}</label>
      ))}</div>
      <button disabled={pending} onClick={() => run(() => setRolesAction(userId, [...sel]), "Update staff roles for this user?")} className="btn-gold mt-3 h-9 px-3 text-sm">Save roles</button>
      {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.t}</p>}
    </div>
  );
}

export function NoteForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(addAdminNoteAction.bind(null, userId), {});
  return (
    <form action={action} className="space-y-2">
      <textarea name="note" required maxLength={4000} className="input min-h-20" placeholder="Admin-only support note…" aria-label="Note" />
      <button disabled={pending} className="btn-outline h-9 px-3 text-sm">Add note</button>
      {state.error && <p className="text-sm text-red-300">{state.error}</p>}
    </form>
  );
}
