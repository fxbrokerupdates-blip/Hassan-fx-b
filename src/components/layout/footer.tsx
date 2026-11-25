import Link from "next/link";
import { BarChart3, ChevronRight, Gift, Globe, Layers, Link2, Mail, Megaphone, TriangleAlert } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { SOCIAL_ICONS } from "@/components/ui/brand-icons";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import type { SiteConfig } from "@/lib/data/site";
import { TrackedLink } from "@/components/analytics/tracked-link";

const COLUMN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  quick_links: Link2, news_insights: BarChart3, free_resources: Layers,
};

export function Footer({ config }: { config: SiteConfig }) {
  const f = config.settings["site.footer"];
  const g = config.settings["site.general"];
  const year = new Date().getFullYear();
  return (
    <footer className="fx-public-footer relative mt-10 overflow-hidden bg-navy-950">
      {/* gold sweep along the top edge, as in the reference */}
      <div aria-hidden className="h-[6px] w-full bg-[linear-gradient(90deg,transparent_0%,var(--primary-gold)_18%,var(--bright-gold)_50%,var(--primary-gold)_82%,transparent_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgb(245_197_66/0.12),transparent_60%)]" />

      <div className="container-site relative grid gap-10 py-10 md:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_0.95fr_0.95fr_1.35fr] lg:gap-6">
        <div>
          <Logo src={g.logo_url} name={g.name} />
          <p className="mt-4 max-w-xs text-[15px] leading-6 text-white/85">{f.description}</p>
          <ul className="mt-5 flex flex-wrap gap-3" aria-label="Social media">
            {config.social.filter((s) => s.show_in_footer).map((s) => {
              const Icon = SOCIAL_ICONS[s.platform];
              return (
                <li key={s.id}>
                  <TrackedLink href={s.url} event={s.platform === "facebook" ? "facebook_click" : s.platform === "linkedin" ? "linkedin_click" : "external_link_click"}
                    meta={{ placement: "footer", platform: s.platform }} external aria-label={s.label}
                    className="grid size-[38px] place-items-center rounded-md bg-gold-500 text-navy-950 transition hover:bg-gold-400">
                    {Icon ? <Icon className="size-5" /> : s.label.slice(0, 1)}
                  </TrackedLink>
                </li>
              );
            })}
          </ul>
        </div>

        {config.footer.map((col) => {
          const Icon = COLUMN_ICONS[col.column_key] ?? Gift;
          const items = col.items.filter((i) => i.visible !== false && (!i.flag || config.flags[i.flag]));
          return (
            <div key={col.id}>
              <h2 className="mb-4 flex items-center gap-2 font-condensed text-lg font-semibold text-gold-400">
                <Icon className="size-[18px]" /> {col.title}
              </h2>
              <ul className="space-y-2">
                {items.map((i) => (
                  <li key={`${col.id}-${i.label}`}>
                    {i.external ? (
                      <TrackedLink href={i.href} external event={/dott/i.test(i.label) ? "dott_plus_click" : "external_link_click"}
                        meta={{ placement: "footer" }} className="group flex items-center gap-1.5 text-[15px] text-white/90 hover:text-gold-400">
                        <ChevronRight className="size-3.5 fill-gold-500 text-gold-500" />{i.label}
                      </TrackedLink>
                    ) : (
                      <Link href={i.href} className="group flex items-center gap-1.5 text-[15px] text-white/90 hover:text-gold-400">
                        <ChevronRight className="size-3.5 fill-gold-500 text-gold-500" />{i.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <div className="lg:border-l lg:border-white/15 lg:pl-6">
          <h2 className="mb-2 flex items-center gap-2 font-condensed text-lg font-semibold text-gold-400">
            <Mail className="size-5" /> {f.newsletter_title}
          </h2>
          <p className="mb-3 text-[14px] leading-5 text-white/85">{f.newsletter_text}</p>
          {config.flags.newsletter ? <NewsletterForm source="footer" /> : null}
          <Link href="/advertise" className="mt-5 flex items-center gap-3 rounded-xl border-[1.5px] border-gold-500 px-4 py-3 transition hover:bg-white/5">
            <Megaphone className="size-8 shrink-0 text-gold-400" />
            <span className="min-w-0 flex-1">
              <span className="block font-condensed text-lg font-semibold text-gold-400">{f.advertise_title}</span>
              <span className="block text-xs text-white/85">{f.advertise_text}</span>
            </span>
            <ChevronRight className="size-5 text-white" />
          </Link>
        </div>
      </div>

      <div className="container-site">
        <div className="border-y border-white/15 py-3 text-[13px] leading-5 text-white/85">
          <TriangleAlert className="mr-2 inline size-5 -translate-y-0.5 fill-gold-500 text-navy-950" />
          <strong className="font-condensed text-[15px] text-gold-400">Risk Disclaimer: </strong>
          {f.risk_disclaimer}
        </div>
        <div className="flex flex-col gap-3 py-5 text-sm text-white/85 md:flex-row md:items-center md:justify-between">
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {[["Legal & Policies", "/legal"], ["Privacy Policy", "/privacy"], ["Terms & Conditions", "/terms"], ["Disclaimer", "/disclaimer"], ["Advertise With Us", "/advertise"]].map(([l, h], i) => (
              <span key={h} className="flex items-center gap-4">
                {i > 0 && <span aria-hidden className="text-white/40">|</span>}
                <Link href={h} className="hover:text-gold-400">{l}</Link>
              </span>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-2 font-semibold text-white"><Globe className="size-5 text-gold-400" />{g.domain}</span>
            <span>© {year} {f.copyright_name}. All Rights Reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
