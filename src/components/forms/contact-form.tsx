"use client";
import { useState } from "react";

export function ContactForm({ kind = "contact" }: { kind?: "contact" | "advertise" }) {
  const [state, setState] = useState<{ ok?: boolean; msg?: string; busy?: boolean }>({});
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    setState({ busy: true });
    const res = await fetch(kind === "advertise" ? "/api/advertise" : "/api/contact", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    setState({ ok: res.ok, msg: res.ok ? "Thank you — we received your message and will reply by email." : j.error ?? "Could not send message." });
    if (res.ok) form.reset();
  }
  return (
    <form onSubmit={onSubmit} className="card-plain grid gap-4 p-6 sm:grid-cols-2">
      {kind === "advertise" ? (
        <>
          <div><label className="label" htmlFor="company">Company</label><input id="company" name="company" required maxLength={160} className="input" /></div>
          <div><label className="label" htmlFor="contact_name">Your name</label><input id="contact_name" name="contact_name" required maxLength={120} className="input" /></div>
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required maxLength={200} className="input" /></div>
          <div><label className="label" htmlFor="website">Website</label><input id="website" name="website_url" type="url" maxLength={300} className="input" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="budget">Budget (optional)</label>
            <select id="budget" name="budget" className="input"><option value="">Select</option><option>Under $1,000</option><option>$1,000 – $5,000</option><option>$5,000 – $20,000</option><option>$20,000+</option></select></div>
        </>
      ) : (
        <>
          <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" required maxLength={120} className="input" /></div>
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required maxLength={200} className="input" /></div>
          <div><label className="label" htmlFor="kind">Topic</label>
            <select id="kind" name="kind" className="input"><option value="contact">General enquiry</option><option value="support">Account support</option>
              <option value="correction">Content correction</option><option value="partnership">Broker partnership</option></select></div>
          <div><label className="label" htmlFor="subject">Subject</label><input id="subject" name="subject" required maxLength={200} className="input" /></div>
        </>
      )}
      <div className="sm:col-span-2"><label className="label" htmlFor="message">Message</label>
        <textarea id="message" name="message" required maxLength={5000} className="input min-h-36" /></div>
      <input name="hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="sm:col-span-2 flex items-center gap-4">
        <button disabled={state.busy} className="btn-gold h-11 px-6">{state.busy ? "Sending…" : "Send message"}</button>
        {state.msg && <p role="status" className={state.ok ? "text-emerald-400" : "text-red-400"}>{state.msg}</p>}
      </div>
    </form>
  );
}
