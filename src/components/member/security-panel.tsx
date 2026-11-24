"use client";
import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { signOutOtherSessionsAction, requestAccountAction } from "@/app/dashboard/actions";

/** Optional TOTP multi-factor authentication (Supabase Auth MFA). */
export function MfaPanel() {
  const supabase = createSupabaseBrowser();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    supabase?.auth.mfa.listFactors().then(({ data }) => {
      const f = data?.totp?.find((x) => x.status === "verified");
      if (f) { setVerified(true); setFactorId(f.id); }
    });
  }, [supabase]);
  if (!supabase) return null;
  async function enroll() {
    const { data, error } = await supabase!.auth.mfa.enroll({ factorType: "totp", friendlyName: `FXBU-${Date.now()}` });
    if (error) { setMsg(error.message); return; }
    setFactorId(data.id); setQr(data.totp.qr_code);
  }
  async function verify() {
    if (!factorId) return;
    const { error } = await supabase!.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) setMsg("Invalid code."); else { setVerified(true); setQr(null); setMsg("Two-factor authentication enabled."); }
  }
  async function disable() {
    if (!factorId || !confirm("Disable two-factor authentication?")) return;
    const { error } = await supabase!.auth.mfa.unenroll({ factorId });
    if (error) setMsg(error.message); else { setVerified(false); setFactorId(null); setMsg("Two-factor authentication disabled."); }
  }
  return (
    <div>
      {verified ? (
        <div className="flex flex-wrap items-center gap-3"><span className="flex items-center gap-2 text-emerald-400"><ShieldCheck className="size-5" />Enabled</span>
          <button onClick={disable} className="btn-outline h-9 px-3 text-sm">Disable</button></div>
      ) : qr ? (
        <div className="space-y-3">
          <p className="text-sm text-white/75">Scan with Google Authenticator, Authy or 1Password, then enter the 6-digit code.</p>
          <Image src={qr} alt="Authenticator QR code" width={180} height={180} unoptimized className="rounded bg-white p-2" />
          <div className="flex gap-2"><input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} className="input w-40" aria-label="Code" /><button onClick={verify} className="btn-gold px-4">Verify</button></div>
        </div>
      ) : <button onClick={enroll} className="btn-outline h-10 px-4">Enable two-factor authentication</button>}
      {msg && <p role="status" className="mt-2 text-sm text-white/80">{msg}</p>}
    </div>
  );
}

export function SessionsPanel() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button disabled={pending} onClick={() => start(async () => { const r = await signOutOtherSessionsAction(); setMsg(r.message ?? r.error ?? null); })} className="btn-outline h-10 px-4">Sign out all other sessions</button>
      {msg && <span role="status" className="text-sm text-white/80">{msg}</span>}
    </div>
  );
}

export function AccountRequests() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <a href="/api/account/export" className="btn-outline h-10 px-4">Download my data (JSON)</a>
        <button disabled={pending} className="btn-danger h-10 px-4" onClick={() => {
          const note = prompt("Request permanent account deletion? Optionally tell us why:");
          if (note === null) return;
          start(async () => { const r = await requestAccountAction("account_deletion", note); setMsg(r.message ?? r.error ?? null); });
        }}>Request account deletion</button>
      </div>
      {msg && <p role="status" className="text-sm text-white/80">{msg}</p>}
    </div>
  );
}
