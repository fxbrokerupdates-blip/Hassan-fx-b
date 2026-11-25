import Link from "next/link";
import {DesktopOverview} from "@/components/dashboard/desktop-overview";
import { Bell, Flame, Settings2, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ARTICLE_LIST_FIELDS } from "@/lib/data/news";
import { NewsCard } from "@/components/news/news-card";
import { Empty, Panel } from "@/components/dashboard/widgets";
import { formatDate, timeAgo } from "@/lib/utils";
import { labelOf, LANGUAGES, MARKETS } from "@/lib/defaults";
import type { Article } from "@/types/db";

export const metadata = { title: "Dashboard" };

export default async function DashboardHome() {
  const viewer = await requireUser();
  const supabase = await createSupabaseServer();
  const tz = viewer.profile?.timezone || "UTC";
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: prefs }, { data: follows }] = await Promise.all([
    supabase.from("user_preferences").select("market_categories").eq("user_id", viewer.id).maybeSingle(),
    supabase.from("favourite_brokers").select("broker_id, brokers(name,slug)").eq("user_id", viewer.id),
  ]);
  const markets: string[] = prefs?.market_categories ?? [];
  const brokerIds = (follows ?? []).map((f) => f.broker_id);
  const base = () => supabase.from("news_articles").select(ARTICLE_LIST_FIELDS).eq("status", "published").order("published_at", { ascending: false });
  const [broker, trading, hot, followed, prompts, scripts, saved, gens, notes] = await Promise.all([
    base().eq("news_type", "broker").limit(4),
    (markets.length ? base().eq("news_type", "trading").in("market", markets) : base().eq("news_type", "trading")).limit(4),
    base().eq("priority", "hot").limit(5),
    brokerIds.length ? base().in("broker_id", brokerIds).limit(5) : Promise.resolve({ data: [] }),
    supabase.from("banner_prompts").select("id,title,category,aspect_ratio,language").eq("status", "published").eq("publish_date", today).limit(4),
    supabase.from("video_scripts").select("id,title,duration_seconds,language").eq("status", "published").eq("publish_date", today).limit(4),
    supabase.from("saved_content").select("id,content_type,content_id,title,created_at").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("ai_generations").select("id,content_type,title,created_at").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("user_notifications").select("id,created_at,notifications(title,link)").eq("user_id", viewer.id).is("read_at", null).order("created_at", { ascending: false }).limit(5),
  ]);
  const first = (viewer.profile?.full_name || "there").split(" ")[0];
  const savedHref = (s: { content_type: string; content_id: string }) =>
    s.content_type === "article" ? `/dashboard/saved` : s.content_type === "ai_generation" ? `/dashboard/history?id=${s.content_id}` : "/dashboard/saved";

  return (
    <><DesktopOverview name={first} userId={viewer.id} articles={[...(broker.data??[]),...(trading.data??[]),...(hot.data??[])] as unknown as Article[]}/><div className="space-y-6 fx-member-legacy">
      <section className="card-navy flex flex-wrap items-center gap-4 p-6">
        <div className="flex-1">
          <p className="text-sm text-muted">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: tz }).format(new Date())}</p>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Welcome back, <span className="gold-text">{first}</span></h2>
          <p className="mt-1 text-white/75">Here’s what’s new in broker and market news today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/trader" className="btn-gold h-11 px-5">Trader Workspace</Link>
          <Link href="/dashboard/studio" className="btn-gold h-11 px-5"><Sparkles className="size-5" />Open AI Creator Studio</Link>
          <Link href="/dashboard/settings#preferences" className="btn-outline h-11 px-4"><Settings2 className="size-4" />Personalize</Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="HOT" gold="Headlines" href="/dashboard/news?type=all" className="xl:col-span-1">
          {(hot.data ?? []).length ? (
            <ul className="space-y-2">{(hot.data as unknown as Article[]).map((a) => (
              <li key={a.id}><Link href={`/news/${a.slug}`} className="flex gap-2 rounded p-1 hover:bg-white/5"><Flame className="mt-0.5 size-4 shrink-0 text-hot" />
                <span><span className="line-clamp-2 text-sm font-semibold">{a.title}</span><span className="text-xs text-muted">{timeAgo(a.published_at)}</span></span></Link></li>
            ))}</ul>
          ) : <Empty>No HOT headlines right now.</Empty>}
        </Panel>
        <Panel title="Today's" gold="Banner Prompts" href="/dashboard/prompts">
          {(prompts.data ?? []).length ? (
            <ul className="space-y-2">{prompts.data!.map((p) => (
              <li key={p.id}><Link href={`/dashboard/prompts#prompt-${p.id}`} className="block rounded-lg bg-white/5 p-3 hover:bg-white/10">
                <span className="block text-sm font-semibold">{p.title}</span><span className="text-xs text-muted">{p.aspect_ratio} · {labelOf(LANGUAGES, p.language)}</span></Link></li>
            ))}</ul>
          ) : <Empty>Today’s prompts haven’t been published yet.</Empty>}
        </Panel>
        <Panel title="Today's" gold="Video Scripts" href="/dashboard/scripts">
          {(scripts.data ?? []).length ? (
            <ul className="space-y-2">{scripts.data!.map((s) => (
              <li key={s.id}><Link href={`/dashboard/scripts#script-${s.id}`} className="block rounded-lg bg-white/5 p-3 hover:bg-white/10">
                <span className="block text-sm font-semibold">{s.title}</span><span className="text-xs text-muted">{s.duration_seconds}s · {labelOf(LANGUAGES, s.language)}</span></Link></li>
            ))}</ul>
          ) : <Empty>Today’s scripts haven’t been published yet.</Empty>}
        </Panel>
      </div>

      <Panel title="Latest" gold="Broker News" href="/dashboard/news?type=broker">
        {(broker.data ?? []).length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{(broker.data as unknown as Article[]).map((a) => <NewsCard key={a.id} a={a} />)}</div> : <Empty>No broker news yet.</Empty>}
      </Panel>
      <Panel title="Latest" gold="Trading News" href="/dashboard/news?type=trading">
        {markets.length > 0 && <p className="mb-3 text-xs text-muted">Filtered by your markets: {markets.map((m) => labelOf(MARKETS, m)).join(", ")}</p>}
        {(trading.data ?? []).length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{(trading.data as unknown as Article[]).map((a) => <NewsCard key={a.id} a={a} />)}</div> : <Empty>No trading news yet.</Empty>}
      </Panel>

    </div><div className="grid gap-6 lg:grid-cols-2 fx-member-personal-panels">
        <Panel title="Followed" gold="Broker Updates" href="/dashboard/brokers" hrefLabel="Manage">
          {brokerIds.length === 0 ? <Empty>Follow brokers to see their updates here. <Link href="/brokers" className="text-gold-400 underline">Browse brokers</Link></Empty>
            : (followed.data ?? []).length ? (followed.data as unknown as Article[]).map((a) => <NewsCard key={a.id} a={a} variant="compact" />)
            : <Empty>No recent updates from brokers you follow.</Empty>}
        </Panel>
        <Panel title="Unread" gold="Notifications" href="/dashboard/notifications">
          {(notes.data ?? []).length ? (
            <ul className="space-y-2">{(notes.data as unknown as { id: string; created_at: string; notifications: { title: string; link: string | null } | null }[]).map((n) => (
              <li key={n.id} className="flex items-start gap-2 rounded bg-white/5 p-2 text-sm"><Bell className="mt-0.5 size-4 text-gold-400" />
                <span className="flex-1">{n.notifications?.title}<span className="block text-xs text-muted">{timeAgo(n.created_at)}</span></span></li>
            ))}</ul>
          ) : <Empty>You’re all caught up.</Empty>}
        </Panel>
        <Panel title="Recently" gold="Saved" href="/dashboard/saved">
          {(saved.data ?? []).length ? (
            <ul className="divide-y divide-white/5">{saved.data!.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm"><Link href={savedHref(s)} className="truncate hover:text-gold-400">{s.title ?? s.content_type}</Link>
                <span className="shrink-0 text-xs text-muted">{s.content_type.replace("_", " ")} · {formatDate(s.created_at)}</span></li>
            ))}</ul>
          ) : <Empty>Nothing saved yet.</Empty>}
        </Panel>
        <Panel title="Recent" gold="Creations" href="/dashboard/history">
          {(gens.data ?? []).length ? (
            <ul className="divide-y divide-white/5">{gens.data!.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm"><Link href={`/dashboard/history?id=${g.id}`} className="truncate hover:text-gold-400">{g.title ?? g.content_type}</Link>
                <span className="shrink-0 text-xs text-muted">{formatDate(g.created_at)}</span></li>
            ))}</ul>
          ) : <Empty>Create your first post in the AI Creator Studio.</Empty>}
        </Panel>
      </div>
    </div></>
  );
}
