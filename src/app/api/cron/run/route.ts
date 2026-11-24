import { NextResponse } from "next/server";
import { cronAuthorized } from "../auth";
import { runDueJobs } from "@/lib/jobs/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Generic scheduler endpoint: runs every job whose next_run_at has passed.
 * Call every 2–5 minutes from any scheduler (Supabase pg_cron + pg_net, GitHub Actions, Vercel Pro cron).
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ran: await runDueJobs() });
}
export const POST = GET;
