import type { Metadata } from "next";
import { SupportNav } from "@/components/layout/research-widgets";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/news/page-header";
import { ContactForm } from "@/components/forms/contact-form";
import { getSiteConfig } from "@/lib/data/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Contact Us", description: "Contact FX Broker Updates for support, corrections or partnerships.", path: "/contact" });

export default async function ContactPage() {
  const { settings } = await getSiteConfig();
  return (
    <>
      <PageHeader title="Contact" gold="Us" crumbs={[{ name: "Home", path: "/" }, { name: "Contact Us", path: "/contact" }]}
        description="Questions, corrections or partnership ideas — we read every message." />
      <div className="container-site py-10 fx-support-layout"><SupportNav active="/contact"/><div className="fx-contact-grid grid gap-8 lg:grid-cols-[1fr_320px]">
        <ContactForm />
        <aside className="card-navy h-fit p-6">
          <Mail className="mb-3 size-8 text-gold-400" />
          <p className="font-semibold">Email</p>
          <a href={`mailto:${settings["site.general"].contact_email}`} className="text-gold-400">{settings["site.general"].contact_email}</a>
          <p className="mt-4 text-sm text-white/70">We do not provide investment advice or account services for any broker.</p>
        </aside>
      </div></div>
    </>
  );
}
