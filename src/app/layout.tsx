import type { Metadata, Viewport } from "next";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-semi-condensed/500.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "./globals.css";
import { getSiteConfig } from "@/lib/data/site";
import { env } from "@/lib/env";
import { AnalyticsTracker } from "@/components/analytics/tracker";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSiteConfig();
  const seo = settings["site.seo"];
  const general = settings["site.general"];
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: seo.default_title, template: `%s | ${general.name}` },
    description: seo.default_description,
    applicationName: general.name,
    openGraph: { type: "website", siteName: general.name, images: [{ url: seo.og_image }] },
    twitter: { card: "summary_large_image", site: seo.twitter_handle || undefined },
    verification: env.googleVerification ? { google: env.googleVerification } : undefined,
    manifest: "/manifest.webmanifest",
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = { themeColor: "#06182D", width: "device-width", initialScale: 1 };

const THEME_VARS: Record<string, string> = {
  deep_navy: "--deep-navy", dark_navy: "--dark-navy", secondary_navy: "--secondary-navy", royal_navy: "--royal-navy",
  primary_gold: "--primary-gold", bright_gold: "--bright-gold", light_bg: "--light-bg", muted_text: "--muted-text",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { settings, flags } = await getSiteConfig();
  const theme = settings["site.theme"] as Record<string, string>;
  const css = Object.entries(THEME_VARS)
    .filter(([k]) => /^#[0-9a-fA-F]{3,8}$/.test(theme[k] ?? ""))
    .map(([k, v]) => `${v}:${theme[k]}`)
    .join(";");
  const tracking = settings["analytics.tracking"];
  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <head>
        <style>{`:root{${css}}`}</style>
      </head>
      <body className="min-h-screen bg-navy-950 font-sans text-white">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-gold-500 focus:px-3 focus:py-2 focus:text-navy-950">
          Skip to content
        </a>
        {children}
        <AnalyticsTracker config={tracking} />
        {flags.pwa ? <ServiceWorkerRegister /> : null}
      </body>
    </html>
  );
}
