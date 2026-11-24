import { notFound } from "next/navigation";
import { PromptLibrary } from "@/components/content/libraries";
import { memberFeatureEnabled } from "@/lib/features";
import type { RawParams } from "@/lib/params";

export const metadata = { title: "Daily Banner Prompts" };

export default async function Page({ searchParams }: { searchParams: Promise<RawParams> }) {
  if (!(await memberFeatureEnabled("banner_prompts"))) notFound();
  return (
    <div>
      <h2 className="mb-4 font-display text-2xl font-bold">Daily <span className="gold-text">Banner Prompts</span></h2>
      <PromptLibrary sp={await searchParams} basePath="/dashboard/prompts" />
    </div>
  );
}
