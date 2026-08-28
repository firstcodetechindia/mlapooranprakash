import { NextResponse } from "next/server";

import { refreshDueAnalytics } from "@/lib/analytics/service";

/**
 * Triggered by Vercel Cron (see vercel.json). Sweeps every tenant's stale
 * published-post analytics, same CRON_SECRET-gated pattern as
 * /api/cron/publish-scheduled — see src/lib/social/publish.ts.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshDueAnalytics();
  return NextResponse.json(result);
}
