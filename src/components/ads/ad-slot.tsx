import Image from "next/image";
import { createSupabasePublic } from "@/lib/supabase/server";
import { AdImpression, AdLink } from "@/components/ads/ad-impression";
import type { Advertisement } from "@/types/db";

/** Renders one active advertisement for a placement. Always labelled as sponsored. */
export async function AdSlot({ placement, className }: { placement: string; className?: string }) {
  const db = createSupabasePublic();
  if (!db) return null;
  const nowIso = new Date().toISOString();
  const { data } = await db.from("advertisements").select("id,advertiser,campaign_name,image_url,headline,destination_url,placement,is_affiliate")
    .eq("placement", placement).eq("is_active", true).lte("starts_at", nowIso)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`).limit(5);
  const ads = (data ?? []) as Advertisement[];
  if (!ads.length) return null;
  const ad = ads[Math.floor(Math.random() * ads.length)];
  return (
    <aside className={className} aria-label="Advertisement">
      <div className="card-plain relative overflow-hidden p-3">
        <span className="absolute right-2 top-2 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90">
          {ad.is_affiliate ? "Sponsored · Affiliate" : "Sponsored"}
        </span>
        <AdLink id={ad.id} href={ad.destination_url} placement={placement} className="flex items-center gap-4">
          {ad.image_url ? (
            <Image src={ad.image_url} alt={ad.headline ?? ad.advertiser} width={728} height={90} className="h-auto max-h-28 w-full rounded object-cover" />
          ) : (
            <span className="block p-2">
              <span className="block font-condensed text-lg font-semibold text-gold-400">{ad.headline ?? ad.campaign_name}</span>
              <span className="text-sm text-white/70">{ad.advertiser}</span>
            </span>
          )}
        </AdLink>
        <AdImpression id={ad.id} />
      </div>
    </aside>
  );
}
