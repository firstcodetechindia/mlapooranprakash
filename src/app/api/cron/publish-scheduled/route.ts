import { NextResponse } from "next/server";

import { runScheduledPublishing } from "@/lib/social/publish";

/**
 * Triggered by Vercel Cron (see vercel.json) — Vercel serverless functions
 * can't host a persistent BullMQ worker, so due drafts are swept
 * periodically instead of dispatched to a delayed queue. Authenticated
 * with CRON_SECRET so this can't be hit by anyone who finds the URL.
 *
 * Runs once daily on the Hobby plan (Vercel's cap for that tier) — see the
 * schedule comment in vercel.json and docs/deployment.md for the Pro-plan
 * upgrade path to a tighter interval.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  // Fail closed: an unset CRON_SECRET must never mean "open to anyone who
  // finds the URL" — it means the deployment is misconfigured.
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runScheduledPublishing();
  return NextResponse.json({ processed: results.length, results });
}
