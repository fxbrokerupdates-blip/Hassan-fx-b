import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { getSiteConfig } from "@/lib/data/site";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;
export const metadata: Metadata = pageMetadata({ title: "Privacy Policy", description: "How FX Broker Updates collects, uses and protects data, including first-party analytics.", path: "/privacy" });

export default async function Page() {
  const { settings } = await getSiteConfig();
  return <LegalPage title="Privacy" gold="Policy" path="/privacy" text={settings["site.legal"].privacy} />;
}
