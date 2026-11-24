"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { passwordStrength } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

export function Field({ label, name, error, children }: { label: string; name: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {children}
      {error && <p id={`${name}-error`} className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function PasswordInput({ name, autoComplete, showStrength, invalid }: { name: string; autoComplete: string; showStrength?: boolean; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  const s = passwordStrength(value);
  return (
    <div>
      <div className="relative">
        <input id={name} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required maxLength={72}
          value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={invalid || undefined}
          className={cn("input pr-11", invalid && "border-red-500")} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted hover:text-white">
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showStrength && value && (
        <div className="mt-2" aria-live="polite">
          <div className="flex gap-1">{[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={cn("h-1 flex-1 rounded", i < s.score ? (s.score >= 4 ? "bg-emerald-400" : s.score >= 3 ? "bg-gold-500" : "bg-red-400") : "bg-white/10")} />
          ))}</div>
          <p className="mt-1 text-xs text-muted">{s.label} · 10+ characters with upper, lower case and a number</p>
        </div>
      )}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: React.ReactNode }) {
  const cls = kind === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" : kind === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-gold-500/40 bg-gold-500/10 text-gold-400";
  return <div role={kind === "error" ? "alert" : "status"} className={cn("rounded-lg border p-3 text-sm", cls)}>{children}</div>;
}
