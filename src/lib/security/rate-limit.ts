import "server-only";

import { db } from "@/lib/db/client";

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(`Too many attempts. Try again in ${retryAfterSeconds}s.`);
    this.name = "RateLimitError";
  }
}

/**
 * Fixed-window counter backed by a single atomic upsert (not a
 * read-then-write) so concurrent requests can't both slip past the check —
 * see the RateLimitBucket model for why this is Postgres-backed instead of
 * an in-memory counter, which wouldn't be shared across Vercel's
 * serverless instances.
 *
 * Throws RateLimitError when the key has already hit `limit` attempts
 * within the current `windowSeconds` window; otherwise increments and
 * returns.
 */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowSeconds * 1000);

  const rows = await db.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimitBucket" (key, "windowStart", count, "updatedAt")
    VALUES (${key}, ${now}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN "RateLimitBucket"."windowStart" < ${cutoff} THEN 1 ELSE "RateLimitBucket".count + 1 END,
      "windowStart" = CASE WHEN "RateLimitBucket"."windowStart" < ${cutoff} THEN ${now} ELSE "RateLimitBucket"."windowStart" END,
      "updatedAt" = ${now}
    RETURNING count, "windowStart"
  `;

  const bucket = rows[0];
  if (bucket.count > limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((bucket.windowStart.getTime() + windowSeconds * 1000 - now.getTime()) / 1000),
    );
    throw new RateLimitError(retryAfterSeconds);
  }
}
