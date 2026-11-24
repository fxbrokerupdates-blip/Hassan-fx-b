import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { getSiteConfig } from "@/lib/data/site";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;
export const metadata: Metadata = pageMetadata({ title: "Risk Disclaimer", description: "Financial risk disclaimer.", path: "/disclaimer" });

export default async function Page() {
  const { settings } = await getSiteConfig();
  return <LegalPage title="Risk" gold="Disclaimer" path="/disclaimer" text={settings["site.legal"].disclaimer} />;
}
