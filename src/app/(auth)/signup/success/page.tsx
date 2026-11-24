import Link from "next/link";
import { MailCheck } from "lucide-react";

export const metadata = { title: "Check your email", robots: { index: false } };

export default async function SignUpSuccess({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <div className="card-navy p-8 text-center">
      <MailCheck className="mx-auto mb-4 size-14 text-gold-400" />
      <h1 className="font-display text-2xl font-bold">Check your <span className="gold-text">inbox</span></h1>
      <p className="mt-3 text-white/80">
        If <strong>{email ?? "your email"}</strong> is not already registered, we sent a verification link to it. Click the link to activate your account.
      </p>
      <p className="mt-2 text-sm text-muted">Didn’t receive it? Check spam, or resend below.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href={`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="btn-outline h-10 px-5">Resend email</Link>
        <Link href="/login" className="btn-gold h-10 px-5">Go to login</Link>
      </div>
    </div>
  );
}
