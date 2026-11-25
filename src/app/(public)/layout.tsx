import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getSiteConfig } from "@/lib/data/site";
import { isDevelopmentMode, isSupabaseConfigured } from "@/lib/env";
import { MaintenanceNotice } from "@/components/layout/maintenance";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const config = await getSiteConfig();
  const g = config.settings["site.general"];
  const maintenance = config.settings["site.maintenance"];
  return (
    <>
      {isDevelopmentMode && !isSupabaseConfigured && (
        <div className="bg-fuchsia-700 px-4 py-1.5 text-center text-xs font-semibold">
          Development mode — Supabase is not configured. Items marked SAMPLE are placeholders, not real news.
        </div>
      )}
      <div className="fx-public-shell"><Header premium nav={config.nav} logoUrl={g.logo_url} siteName={g.name} />
      <main id="main" className="fx-public-main">{maintenance.enabled ? <MaintenanceNotice message={maintenance.message} /> : children}</main>
      <Footer config={config} />
      {!maintenance.enabled && <MobileNav/>}</div>
    </>
  );
}
