import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { getSiteConfig } from "@/lib/data/site";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;
export const metadata: Metadata = pageMetadata({ title: "About Us", description: "About FX Broker Updates — independent broker and trading market news.", path: "/about" });

export default async function Page() {
  const { settings } = await getSiteConfig();
  return <LegalPage title="About" gold="Us" path="/about" text={settings["site.legal"].about} />;
}
