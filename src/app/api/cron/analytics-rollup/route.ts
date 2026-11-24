import { NextResponse } from "next/server";
import { cronAuthorized } from "../auth";
import { runJob } from "@/lib/jobs/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ today: await runJob("analytics_rollup"), daily: await runJob("analytics_daily") });
}
