import { NextResponse } from "next/server";
import { cronAuthorized } from "../auth";
import { runJob } from "@/lib/jobs/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = {};
  for (const k of ["presence_prune", "notifications_dispatch", "analytics_purge", "daily_content"]) out[k] = await runJob(k);
  return NextResponse.json(out);
}
