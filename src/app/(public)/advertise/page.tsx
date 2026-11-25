import { SupportNav } from "@/components/layout/research-widgets";
import type { Metadata } from "next";
import { PageHeader } from "@/components/news/page-header";
import { ContactForm } from "@/components/forms/contact-form";
import { RichText } from "@/components/ui/rich-text";
import { getSiteConfig } from "@/lib/data/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Advertise With Us", description: "Promote your broker, product or campaign to traders, IBs and financial professionals.", path: "/advertise" });

export default async function AdvertisePage() {
  const { settings } = await getSiteConfig();
  return (
    <>
      <PageHeader title="Advertise" gold="With Us" crumbs={[{ name: "Home", path: "/" }, { name: "Advertise", path: "/advertise" }]} />
      <div className="container-site py-10 fx-support-layout"><SupportNav active="/advertise"/><div className="fx-contact-grid grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="card-navy h-fit p-6">
          <RichText text={settings["site.legal"].advertise} className="prose-fx text-base" />
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-white/80">
            <li>Homepage and news listing banners</li><li>Article page placements</li><li>Sponsored broker profiles</li>
            <li>Sponsored articles (always labelled)</li><li>Member dashboard placements</li>
          </ul>
        </div>
        <ContactForm kind="advertise" />
      </div></div>
    </>
  );
}
