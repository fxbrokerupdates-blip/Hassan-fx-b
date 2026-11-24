import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/news/page-header";
import { getSiteConfig } from "@/lib/data/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free Daily Tools — Banner Prompts, Video Scripts & AI Studio",
  description: "Free daily AI banner prompts and ready-to-use video scripts for trading and broker news content creators.",
  path: "/free-tools",
});

export default async function FreeToolsPage() {
  const { flags } = await getSiteConfig();
  const tools = [
    flags.banner_prompts && { href: "/free-tools/banner-prompts", title: "Daily Banner Prompts", text: "AI image prompts for professional trading and financial banners in 1:1, 4:5, 9:16 and 16:9.", img: "/images/banner-prompt.png" },
    flags.video_scripts && { href: "/free-tools/video-scripts", title: "Daily Video Scripts", text: "Ready-to-use 15-second to 2-minute scripts in English, Urdu, Roman Urdu, Hindi and Arabic.", img: "/images/video-script.png" },
  ].filter(Boolean) as { href: string; title: string; text: string; img: string }[];
  return (
    <>
      <PageHeader title="Free Daily" gold="Tools" description="Create professional financial content faster — free for registered members."
        crumbs={[{ name: "Home", path: "/" }, { name: "Free Tools", path: "/free-tools" }]} />
      <div className="container-site grid gap-6 py-10 md:grid-cols-3">
        {tools.map((t) => (
          <Link key={t.href} href={t.href} className="card-light flex flex-col items-start gap-3 p-6 transition hover:shadow-[var(--shadow-gold)]">
            <Image src={t.img} alt="" width={160} height={92} className="h-20 w-auto" />
            <h2 className="font-display text-xl font-bold">{t.title}</h2>
            <p className="text-sm text-navy-800">{t.text}</p>
          </Link>
        ))}
        {flags.ai_studio && (
          <Link href="/dashboard/studio" className="card-navy flex flex-col items-start gap-3 p-6">
            <Sparkles className="size-16 text-gold-400" />
            <h2 className="font-display text-xl font-bold">AI Creator Studio</h2>
            <p className="text-sm text-white/80">Turn any news story into posts, captions, scripts and banner prompts. Free account required.</p>
          </Link>
        )}
      </div>
    </>
  );
}
