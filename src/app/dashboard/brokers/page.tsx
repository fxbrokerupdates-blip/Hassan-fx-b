import Link from "next/link";
import { BellOff, BellRing, Building2, HeartOff } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ActionButton } from "@/components/member/action-button";
import { toggleBrokerNotifyAction } from "@/app/dashboard/actions";
import { FollowButton } from "@/components/brokers/follow-button";
import { Empty, Panel } from "@/components/dashboard/widgets";
import { NewsCard } from "@/components/news/news-card";
import { ARTICLE_LIST_FIELDS } from "@/lib/data/news";
import type { Article } from "@/types/db";

export const metadata = { title: "Favourite Brokers" };

export default async function FavouriteBrokers() {
  const viewer = await requireUser();
  const supabase = await createSupabaseServer();
  const { data: follows } = await supabase.from("favourite_brokers").select("broker_id,notify,created_at,brokers(id,name,slug,short_description)").eq("user_id", viewer.id).order("created_at", { ascending: false });
  const rows = (follows ?? []) as unknown as { broker_id: string; notify: boolean; brokers: { id: string; name: string; slug: string; short_description: string | null } | null }[];
  const ids = rows.map((r) => r.broker_id);
  const { data: news } = ids.length
    ? await supabase.from("news_articles").select(ARTICLE_LIST_FIELDS).eq("status", "published").in("broker_id", ids).order("published_at", { ascending: false }).limit(9)
    : { data: [] };
  const { data: suggestions } = await supabase.from("brokers").select("id,name,slug").eq("status", "active").order("is_featured", { ascending: false }).limit(12);
  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold">Favourite <span className="gold-text">Brokers</span></h2>
      <Panel title="Brokers you" gold="follow">
        {rows.length === 0 ? <Empty>You’re not following any brokers yet.</Empty> : (
          <ul className="divide-y divide-white/5">
            {rows.map((r) => r.brokers && (
              <li key={r.broker_id} className="flex flex-wrap items-center gap-3 py-3">
                <Building2 className="size-5 text-gold-400" />
                <Link href={`/brokers/${r.brokers.slug}`} className="flex-1 font-semibold hover:text-gold-400">{r.brokers.name}</Link>
                <ActionButton action={() => toggleBrokerNotifyAction(r.broker_id, !r.notify)} className="btn-ghost h-9 px-3 text-sm ring-1 ring-white/10"
                  title={r.notify ? "Turn off notifications" : "Turn on notifications"}>
                  {r.notify ? <><BellRing className="size-4 text-gold-400" />Notifications on</> : <><BellOff className="size-4" />Notifications off</>}
                </ActionButton>
                <FollowButton brokerId={r.broker_id} initial />
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Updates from" gold="your brokers">
        {(news ?? []).length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{(news as unknown as Article[]).map((a) => <NewsCard key={a.id} a={a} />)}</div> : <Empty>No recent updates.</Empty>}
      </Panel>
      <Panel title="Discover" gold="brokers" href="/brokers" hrefLabel="Broker directory">
        <div className="flex flex-wrap gap-2">
          {(suggestions ?? []).filter((s) => !ids.includes(s.id)).map((s) => (
            <Link key={s.id} href={`/brokers/${s.slug}`} className="rounded-full px-3 py-1.5 text-sm ring-1 ring-white/15 hover:text-gold-400">{s.name}</Link>
          ))}
          {(suggestions ?? []).length === 0 && <span className="flex items-center gap-2 text-sm text-muted"><HeartOff className="size-4" />No brokers listed yet.</span>}
        </div>
      </Panel>
    </div>
  );
}
