import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { getSiteConfig } from "@/lib/data/site";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;
export const metadata: Metadata = pageMetadata({ title: "Terms & Conditions", description: "Terms and conditions for using FX Broker Updates.", path: "/terms" });

export default async function Page() {
  const { settings } = await getSiteConfig();
  return <LegalPage title="Terms &" gold="Conditions" path="/terms" text={settings["site.legal"].terms} />;
}
