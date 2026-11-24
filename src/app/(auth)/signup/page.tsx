import type { Metadata } from "next";
import { SignUpForm } from "./signup-form";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Sign Up", robots: { index: false } };

export default function SignUpPage() {
  return <SignUpForm turnstileKey={env.turnstileSiteKey || undefined} />;
}
