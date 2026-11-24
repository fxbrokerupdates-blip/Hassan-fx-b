import { NextResponse } from "next/server";
import { cronAuthorized } from "../auth";
import { runJob } from "@/lib/jobs/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const news = await runJob("news_refresh");
  const publish = await runJob("publish_scheduled");
  return NextResponse.json({ news, publish });
}
