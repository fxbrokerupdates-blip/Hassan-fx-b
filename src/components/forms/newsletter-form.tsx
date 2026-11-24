"use client";
import { useState } from "react";
import { track } from "@/lib/analytics/client";

export function NewsletterForm({ source = "footer", compact = true }: { source?: string; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), consent: data.get("consent") === "on", source, website: data.get("website") }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Subscription failed");
      setState("ok");
      setMessage(json.message || "You're subscribed.");
      track("newsletter_signup", { feature: "newsletter", metadata: { source } });
      form.reset();
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Subscription failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2" noValidate>
      <div className={compact ? "flex overflow-hidden rounded-lg bg-white" : "flex flex-col gap-2 sm:flex-row"}>
        <label htmlFor={`nl-${source}`} className="sr-only">Email address</label>
        <input id={`nl-${source}`} name="email" type="email" required maxLength={200} placeholder="Enter your email address"
          className="min-w-0 flex-1 bg-white px-3 py-2.5 text-sm text-navy-900 placeholder:text-slate-500 focus:outline-none" />
        {/* honeypot */}
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <button disabled={state === "loading"} className="btn-gold rounded-none px-4 text-[15px]">
          {state === "loading" ? "…" : "Subscribe"}
        </button>
      </div>
      <label className="flex items-start gap-2 text-[11px] leading-4 text-white/70">
        <input type="checkbox" name="consent" required className="mt-0.5 accent-[var(--primary-gold)]" />
        I agree to receive email updates and accept the Privacy Policy. Unsubscribe anytime.
      </label>
      {message && (
        <p role="status" className={state === "ok" ? "text-xs text-emerald-400" : "text-xs text-red-400"}>{message}</p>
      )}
    </form>
  );
}
