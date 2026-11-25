import "server-only";
import { cache } from "react";
import { createSupabasePublic } from "@/lib/supabase/server";
import { isDevelopmentMode } from "@/lib/env";
import { SAMPLE_BROKERS } from "@/lib/sample-data";
import type { Broker } from "@/types/db";

export const listBrokers = cache(async (q?: string): Promise<Broker[]> => {
  const db = createSupabasePublic();
  if (!db) return isDevelopmentMode ? SAMPLE_BROKERS.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase())) : [];
  let query = db.from("brokers").select("*").eq("status", "active");
  if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await query.order("is_featured", { ascending: false }).order("name").limit(500);
  return (data ?? []) as Broker[];
});

export interface BrokerDetail {
  broker: Broker;
  sources: { label: string; url: string; source_kind: string; checked_at: string }[];
  regulations: { id: string; regulator: string; license_number: string | null; jurisdiction: string | null; status: string; verification_url: string; verified_at: string | null }[];
  promotions: { id: string; title: string; description: string | null; terms_url: string | null; source_url: string | null; starts_at: string | null; ends_at: string | null; is_verified: boolean }[];
  reviews: { id: string; review_type: "editorial" | "user" | "sponsored"; rating: number | null; title: string; body: string; created_at: string }[];
}

export const getBroker = cache(async (slug: string): Promise<BrokerDetail | null> => {
  const db = createSupabasePublic();
  if (!db) {
    const b = isDevelopmentMode ? SAMPLE_BROKERS.find((x) => x.slug === slug) : undefined;
    return b ? { broker: b, regulations: [], promotions: [], reviews: [], sources: [] } : null;
  }
  const { data: broker } = await db.from("brokers").select("*").eq("slug", slug).eq("status", "active").maybeSingle();
  if (!broker) return null;
  const [regs, promos, reviews, sources] = await Promise.all([
    db.from("broker_regulations").select("*").eq("broker_id", broker.id).order("regulator"),
    db.from("broker_promotions").select("*").eq("broker_id", broker.id).eq("status", "active").order("starts_at", { ascending: false }),
    db.from("broker_reviews").select("id,review_type,rating,title,body,created_at").eq("broker_id", broker.id).eq("status", "approved").order("created_at", { ascending: false }).limit(20),
    db.from("broker_profile_sources").select("label,url,source_kind,checked_at").eq("broker_id", broker.id).order("checked_at", { ascending: false }),
  ]);
  return {
    broker: broker as Broker,
    sources: (sources.data ?? []) as BrokerDetail["sources"],
    regulations: (regs.data ?? []) as BrokerDetail["regulations"],
    promotions: (promos.data ?? []) as BrokerDetail["promotions"],
    reviews: (reviews.data ?? []) as BrokerDetail["reviews"],
  };
});

export const listVerifiedLicenseRecords = cache(async (): Promise<{broker_id:string;regulator:string;jurisdiction:string|null;license_number:string|null;verified_at:string|null}[]> => {
  const db = createSupabasePublic();
  if (!db) return [];
  const { data } = await db.from("broker_regulations").select("broker_id,regulator,jurisdiction,license_number,verified_at").eq("status","verified").not("verified_at","is",null).limit(1000);
  return data ?? [];
});
