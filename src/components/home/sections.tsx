import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, BarChart3, CalendarDays, ChevronRight, CirclePlay, Download, Landmark, Megaphone, Newspaper, Rocket, Star,
} from "lucide-react";
import { NamedIcon } from "@/components/ui/icon";
import { FacebookIcon, LinkedinIcon } from "@/components/ui/brand-icons";
import { TrackedLink } from "@/components/analytics/tracked-link";
import type { HomepageContent } from "@/lib/defaults";
import type { Article, Category } from "@/types/db";
import { formatDate, cn } from "@/lib/utils";
import { labelOf, MARKETS } from "@/lib/defaults";

/* ---------------- Hero ---------------- */
export function Hero({ data }: { data: HomepageContent["hero"] }) {
  return (
    <section className="relative isolate overflow-hidden bg-[radial-gradient(ellipse_at_20%_20%,#0d2c52_0%,var(--deep-navy)_45%,var(--dark-navy)_100%)]">
      {/* faint skyline texture */}
      <div aria-hidden className="absolute inset-0 -z-10 opacity-30 [background:linear-gradient(180deg,transparent_60%,rgb(3_18_34/0.9)),repeating-linear-gradient(90deg,transparent_0_38px,rgb(255_255_255/0.025)_38px_40px)]" />
      <div className="relative lg:min-h-[294px]">
        <div className="relative h-[220px] w-full sm:h-[300px] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[52%]">
          <Image src={data.image_url || "/images/hero-markets.webp"} alt="Global markets, trading charts and broker industry illustration"
            fill priority sizes="(min-width:1024px) 52vw, 100vw"
            className="object-cover object-left lg:[mask-image:linear-gradient(90deg,transparent_0%,#000_14%)]" />
          <div aria-hidden className="absolute inset-0 bg-linear-to-t from-navy-950/90 via-transparent to-transparent lg:hidden" />
        </div>
        <div className="container-site relative -mt-16 pb-6 lg:mt-0 lg:pb-3 lg:pt-[22px]">
          <div className="max-w-[600px] xl:pl-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-gold-500 py-[3px] pl-[3px] pr-4 font-display text-[12px] font-bold uppercase tracking-[0.01em] text-navy-950 sm:text-[15px]">
              <span className="grid size-[26px] place-items-center rounded-full bg-navy-950 text-gold-400"><Megaphone className="size-4" /></span>
              {data.badge}
            </p>
            <h1 className="mt-2.5 font-display text-[26px] font-extrabold leading-[1.02] tracking-[-0.01em] sm:text-[40px]">
              <span className="block text-white">{data.title_line1}</span>
              <span className="gold-text block">{data.title_line2}</span>
            </h1>
            <p className="mt-2 text-[17px] leading-[1.13] text-white/95 sm:text-[19px]">{data.subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-3 sm:gap-5">
              <Link href={data.primary_href} className="btn-gold h-[42px] rounded-xl px-6 text-[19px] sm:w-[242px]">
                <Rocket className="size-5" /> {data.primary_label} <ArrowRight className="size-5" />
              </Link>
              <Link href={data.secondary_href} className="btn-outline h-[42px] rounded-xl px-6 text-[19px] sm:w-[248px]">
                <CirclePlay className="size-6" /> {data.secondary_label}
              </Link>
            </div>
            <ul className="mt-[14px] flex flex-wrap gap-x-7 gap-y-2">
              {data.chips.map((c) => (
                <li key={c.label}>
                  <Link href={c.href} className="flex items-center gap-2 font-condensed text-[15px] text-white/95 hover:text-gold-400">
                    <NamedIcon name={c.icon} className="size-5 text-gold-400" /> {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Social + Dott Plus cards ---------------- */
function SocialIcon({ k, image }: { k: string; image?: string }) {
  if (k === "facebook") return <span className="grid size-[56px] place-items-center rounded-[12px] bg-[#1877F2]"><FacebookIcon className="size-10 text-white" /></span>;
  if (k === "linkedin") return <span className="grid size-[56px] place-items-center rounded-[12px] bg-[#0A66C2]"><LinkedinIcon className="size-9 text-white" /></span>;
  return (
    <span className="grid size-[58px] place-items-center overflow-hidden rounded-[12px] bg-white">
      {image ? <Image src={image} alt="" width={116} height={116} className="size-full object-cover" /> : null}
    </span>
  );
}

export function SocialCards({ data }: { data: HomepageContent["social_cards"] }) {
  const cards = data.cards.filter((c) => c.visible !== false);
  return (
    <section aria-label="Community and partner links" className="container-site mt-4 grid gap-4 md:grid-cols-3 md:gap-[18px]">
      {cards.map((c) => (
        <TrackedLink key={c.key} href={c.href} external={c.external}
          event={c.key === "dott_plus" ? "dott_plus_click" : c.key === "facebook" ? "facebook_click" : c.key === "linkedin" ? "linkedin_click" : "external_link_click"}
          meta={{ placement: "home_cards" }}
          className="card-navy group flex min-h-[86px] items-center gap-4 px-6 py-3 transition hover:border-gold-400 hover:shadow-[var(--shadow-gold)]">
          <SocialIcon k={c.key} image={"image_url" in c ? (c.image_url as string) : undefined} />
          <span className="min-w-0 flex-1">
            <span className="block font-condensed text-[23px] font-semibold leading-7">{c.title}</span>
            <span className="block text-[15px] leading-[18px] text-white/90">{c.description}</span>
          </span>
          {c.key === "dott_plus" ? (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold-500 text-navy-950"><Download className="size-[18px]" /></span>
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-full border-[1.5px] border-white/90 transition group-hover:border-gold-400 group-hover:text-gold-400">
              <ArrowRight className="size-4" />
            </span>
          )}
        </TrackedLink>
      ))}
      <p className="sr-only">Dott Plus is an external partner application. FX Broker Updates does not provide courses or trading signals.</p>
    </section>
  );
}

/* ---------------- Daily free tools ---------------- */
export function DailyTools({ data }: { data: HomepageContent["daily_tools"] }) {
  return (
    <section aria-label="Daily free content tools" className="container-site mt-[14px] grid gap-4 md:grid-cols-2 md:gap-[22px]">
      {data.cards.map((c) => (
        <Link key={c.key} href={c.href}
          className="group relative flex min-h-[90px] items-center gap-3 overflow-hidden rounded-[10px] border border-white/60 bg-[linear-gradient(90deg,#fdfdfd_0%,#f2f5fa_60%,#e7edf6_100%)] py-2 pl-2 pr-5 text-navy-900 shadow-[0_10px_24px_-14px_rgb(0_0_0/0.7)] transition hover:shadow-[var(--shadow-gold)]">
          <span aria-hidden className="absolute inset-y-0 left-0 w-[160px] bg-[radial-gradient(ellipse_at_left,rgb(245_197_66/0.35),transparent_70%)]" />
          <Image src={c.image_url} alt="" width={290} height={168} className="relative h-[60px] w-[86px] shrink-0 object-contain sm:h-[84px] sm:w-[146px]" />
          <span className="relative min-w-0 flex-1">
            <span className="block font-display text-[17px] font-bold leading-[1.08] sm:text-[22px]">{c.title_line1}<br />{c.title_line2}</span>
            <span className="mt-1 block text-[13px] leading-5 text-navy-800 sm:text-[14px]">{c.description}</span>
          </span>
          <span className="relative grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] border-navy-900 transition group-hover:bg-navy-900 group-hover:text-gold-400">
            <ChevronRight className="size-4" />
          </span>
        </Link>
      ))}
    </section>
  );
}

/* ---------------- Full-width news bar ---------------- */
export function NewsBar({ data }: { data: HomepageContent["news_bar"] }) {
  return (
    <section className="container-site mt-[12px]" aria-label="All news">
      <Link href={data.href} className="group relative block h-[48px]">
        <span aria-hidden className="absolute inset-0 [clip-path:polygon(2.2%_0,100%_0,97.8%_100%,0_100%)] bg-[linear-gradient(180deg,var(--bright-gold),var(--primary-gold)_60%,#e2ab22)]" />
        <span aria-hidden className="absolute inset-y-0 left-0 w-[40px] sm:w-[70px] [clip-path:polygon(32%_0,100%_0,68%_100%,0_100%)] bg-[repeating-linear-gradient(115deg,var(--dark-navy)_0_8px,transparent_8px_18px)] opacity-90" />
        <span aria-hidden className="absolute inset-y-0 right-0 w-[40px] sm:w-[70px] [clip-path:polygon(32%_0,100%_0,68%_100%,0_100%)] bg-[repeating-linear-gradient(115deg,var(--dark-navy)_0_8px,transparent_8px_18px)] opacity-90" />
        <span className="relative flex h-full items-center justify-center gap-2 px-11 font-condensed text-[16px] font-semibold text-navy-950 sm:gap-3 sm:px-16 sm:text-[25px]">
          <Newspaper className="hidden size-7 shrink-0 sm:block" />
          <span className="truncate sm:whitespace-normal">{data.label}</span>
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy-950 text-white transition group-hover:translate-x-1">
            <ArrowRight className="size-4" />
          </span>
        </span>
      </Link>
    </section>
  );
}

/* ---------------- Today's updates panels ---------------- */
function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy-900">
      <Star className="size-3.5 fill-gold-500 text-gold-600" />
      <span className="rounded bg-gold-400/90 px-1">{label}</span>
    </span>
  );
}

function PanelItem({ a, first }: { a: Article; first: boolean }) {
  const tag = a.news_type === "broker" ? (a.broker?.name ?? a.category?.name ?? "Broker") : labelOf(MARKETS, a.market);
  return (
    <li className={cn(!first && "border-t border-slate-200")}>
      <Link href={`/news/${a.slug}`} className="group flex items-center gap-2 px-3 py-[7px] hover:bg-slate-50">
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            {a.priority === "hot" && <span className="badge-hot mt-0.5 shrink-0 px-2">Hot</span>}
            {a.is_sample && <span className="badge-sample mt-0.5 shrink-0">Sample</span>}
            <span className="line-clamp-2 font-condensed text-[16px] font-semibold leading-[18px] text-navy-950 group-hover:text-navy-700">{a.title}</span>
          </span>
          <span className="mt-1 flex items-center gap-3 text-[11px] text-slate-700">
            <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{formatDate(a.published_at)}</span>
            <Tag label={tag} />
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-navy-900" />
      </Link>
    </li>
  );
}

export function UpdatesPanel({ kind, plain, gold, items, perPanel }: {
  kind: "broker" | "trading"; plain: string; gold: string; items: Article[]; perPanel: number;
}) {
  const featured = items[0];
  const list = items.slice(0, perPanel);
  const href = kind === "broker" ? "/broker-updates" : "/trading-updates";
  const Icon = kind === "broker" ? Landmark : BarChart3;
  return (
    <section aria-labelledby={`panel-${kind}`}
      className="rounded-[12px] border-[1.5px] border-[#c9d3e0]/80 bg-[linear-gradient(180deg,#0f2b4b,#0a2140)] p-[10px] shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-center gap-3 px-2">
        <Icon className="size-9 text-gold-400" aria-hidden />
        <h2 id={`panel-${kind}`} className="flex-1 font-display text-[21px] font-bold sm:text-[24px]">
          {plain} <span className="gold-text">{gold}</span>
        </h2>
        <Link href={href} className="flex items-center gap-1 font-condensed text-[15px] font-medium hover:text-gold-400">View All <ArrowRight className="size-4" /></Link>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg bg-white/5 p-6 text-center text-sm text-white/70">No published updates yet. New stories will appear here automatically.</p>
      ) : (
        <div className="grid gap-[10px] sm:grid-cols-[178px_1fr]">
          <Link href={`/news/${featured.slug}`} className="relative hidden overflow-hidden rounded-[8px] border-2 border-gold-500 sm:block" aria-label={featured.title}>
            <Image src={featured.featured_image_url || (kind === "broker" ? "/images/sample-broker.webp" : "/images/sample-trading.webp")}
              alt="" fill sizes="178px" className="object-cover" />
          </Link>
          <ul className="overflow-hidden rounded-[8px] bg-white">
            {list.map((a, i) => <PanelItem key={a.id} a={a} first={i === 0} />)}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ---------------- Category cards ---------------- */
export function CategoryCards({ categories }: { categories: Category[] }) {
  const cards = categories.filter((c) => c.show_on_home).slice(0, 6);
  const hrefFor = (c: Category) => (c.slug === "broker-reviews" ? "/brokers" : `/category/${c.slug}`);
  return (
    <section aria-label="News categories" className="container-site mt-[14px] grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-[12px]">
      {cards.map((c) => (
        <Link key={c.id} href={hrefFor(c)}
          className="group flex min-h-[96px] flex-col items-center rounded-[10px] border border-[#5a7398]/70 bg-[linear-gradient(180deg,#123257,#0b2241)] px-2 pb-2 pt-1 text-center transition hover:border-gold-500 hover:shadow-[var(--shadow-gold)]">
          <NamedIcon name={c.icon} className="size-9 fill-gold-500/90 text-gold-400" strokeWidth={1.6} aria-hidden />
          <span className="mt-0.5 font-condensed text-[17px] font-semibold leading-[22px] lg:text-[17px] xl:text-[18px]">{c.name}</span>
          <span className="text-[13px] leading-[15px] text-white/80">{c.home_description}</span>
        </Link>
      ))}
    </section>
  );
}
