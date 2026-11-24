import type { MetadataRoute } from "next";
import { env, isProduction } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: isProduction
      ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/api", "/auth", "/login", "/signup", "/search"] }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: [`${env.siteUrl}/sitemap.xml`, `${env.siteUrl}/news-sitemap.xml`],
  };
}
