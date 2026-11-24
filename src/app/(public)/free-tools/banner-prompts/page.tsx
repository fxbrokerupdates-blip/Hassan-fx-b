import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/news/page-header";
import { PromptLibrary } from "@/components/content/libraries";
import { getSiteConfig } from "@/lib/data/site";
import { pageMetadata } from "@/lib/seo";
import type { RawParams } from "@/lib/params";

export const metadata: Metadata = pageMetadata({
  title: "Daily Free Banner Prompts",
  description: "Free daily AI prompts for professional trading, Forex, gold, crypto and broker news banners.",
  path: "/free-tools/banner-prompts",
});

export default async function Page({ searchParams }: { searchParams: Promise<RawParams> }) {
  if (!(await getSiteConfig()).flags.banner_prompts) notFound();
  return (
    <>
      <PageHeader title="Daily Free" gold="Banner Prompts" description="AI prompts for professional trading banners — new prompts published every day."
        crumbs={[{ name: "Home", path: "/" }, { name: "Free Tools", path: "/free-tools" }, { name: "Banner Prompts", path: "/free-tools/banner-prompts" }]} />
      <div className="container-site py-8"><PromptLibrary sp={await searchParams} basePath="/free-tools/banner-prompts" /></div>
    </>
  );
}
