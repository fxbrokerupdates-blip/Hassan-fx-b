import type { Metadata } from "next";
import { PageHeader } from "@/components/news/page-header";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Newsletter", description: "Daily and weekly broker news and trading updates in your inbox.", path: "/newsletter" });

export default function NewsletterPage() {
  return (
    <>
      <PageHeader title="Stay Ahead of" gold="the Market" crumbs={[{ name: "Home", path: "/" }, { name: "Newsletter", path: "/newsletter" }]}
        description="Broker news, trading updates and free daily content tools. One-click unsubscribe in every email." />
      <div className="container-site py-10"><div className="card-navy max-w-xl p-6"><NewsletterForm source="newsletter_page" /></div></div>
    </>
  );
}
