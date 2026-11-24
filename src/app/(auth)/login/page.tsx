import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Login", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next ? safeNextPath(sp.next) : undefined;
  return <LoginForm next={next} notice={sp.error ? "That sign-in link was invalid or expired. Please log in." : undefined} />;
}
