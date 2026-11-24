import { notFound } from "next/navigation";
import { ScriptLibrary } from "@/components/content/libraries";
import { memberFeatureEnabled } from "@/lib/features";
import type { RawParams } from "@/lib/params";

export const metadata = { title: "Daily Video Scripts" };

export default async function Page({ searchParams }: { searchParams: Promise<RawParams> }) {
  if (!(await memberFeatureEnabled("video_scripts"))) notFound();
  return (
    <div>
      <h2 className="mb-4 font-display text-2xl font-bold">Daily <span className="gold-text">Video Scripts</span></h2>
      <ScriptLibrary sp={await searchParams} basePath="/dashboard/scripts" />
    </div>
  );
}
