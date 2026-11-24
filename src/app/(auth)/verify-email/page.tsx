import { ResendForm } from "./form";

export const metadata = { title: "Verify email", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string; error?: string }> }) {
  const sp = await searchParams;
  return <ResendForm email={sp.email} invalid={Boolean(sp.error)} />;
}
