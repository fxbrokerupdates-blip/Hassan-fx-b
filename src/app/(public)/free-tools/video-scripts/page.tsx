import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/news/page-header";
import { ScriptLibrary } from "@/components/content/libraries";
import { getSiteConfig } from "@/lib/data/site";
import { pageMetadata } from "@/lib/seo";
import type { RawParams } from "@/lib/params";

export const metadata: Metadata = pageMetadata({
  title: "Daily Video Scripts",
  description: "Ready-to-use video scripts for trading and broker news in multiple durations and languages.",
  path: "/free-tools/video-scripts",
});

export default async function Page({ searchParams }: { searchParams: Promise<RawParams> }) {
  if (!(await getSiteConfig()).flags.video_scripts) notFound();
  return (
    <>
      <PageHeader title="Daily" gold="Video Scripts" description="Ready-to-use video scripts for trading & broker news."
        crumbs={[{ name: "Home", path: "/" }, { name: "Free Tools", path: "/free-tools" }, { name: "Video Scripts", path: "/free-tools/video-scripts" }]} />
      <div className="container-site py-8"><ScriptLibrary sp={await searchParams} basePath="/free-tools/video-scripts" /></div>
    </>
  );
}
