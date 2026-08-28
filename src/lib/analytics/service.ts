import "server-only";

import { db } from "@/lib/db/client";
import { getSocialProvider } from "@/lib/social";
import type { Platform } from "@/generated/prisma/enums";
import type { SocialAccountRecord } from "@/lib/social/types";

const STALE_AFTER_MS = 30 * 60 * 1000;
const MAX_REFRESH_BATCH = 50;

async function refreshOne(post: {
  id: string;
  platform: Platform;
  platformPostId: string | null;
  socialAccount: SocialAccountRecord;
}) {
  if (!post.platformPostId) return;

  const provider = getSocialProvider(post.platform);
  const analytics = await provider.getAnalytics(post.socialAccount, post.platformPostId);

  await db.socialPost.update({
    where: { id: post.id },
    data: {
      impressions: analytics?.impressions ?? null,
      likes: analytics?.likes ?? null,
      comments: analytics?.comments ?? null,
      shares: analytics?.shares ?? null,
      analyticsUpdatedAt: new Date(),
    },
  });
}

/**
 * Refreshes analytics for PUBLISHED posts whose snapshot is missing or
 * older than STALE_AFTER_MS. Scoping to an organizationId powers the
 * on-demand "Refresh" button; omitting it is what the cron sweep uses to
 * cover every tenant in one run. Capped per call so neither path can run
 * unbounded against a real platform's rate limits.
 */
export async function refreshDueAnalytics(organizationId?: string) {
  const staleCutoff = new Date(Date.now() - STALE_AFTER_MS);

  const due = await db.socialPost.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      status: "PUBLISHED",
      platformPostId: { not: null },
      OR: [{ analyticsUpdatedAt: null }, { analyticsUpdatedAt: { lt: staleCutoff } }],
    },
    include: { socialAccount: true },
    take: MAX_REFRESH_BATCH,
  });

  let refreshed = 0;
  for (const post of due) {
    try {
      await refreshOne(post);
      refreshed += 1;
    } catch {
      // Leave analyticsUpdatedAt untouched so a transient provider error
      // is retried on the next sweep rather than silently marked fresh.
    }
  }
  return { checked: due.length, refreshed };
}

export interface AnalyticsSummary {
  totals: { impressions: number; likes: number; comments: number; shares: number; postCount: number };
  byPlatform: Record<string, { impressions: number; likes: number; comments: number; shares: number; postCount: number }>;
  topPosts: Array<{
    id: string;
    draftId: string;
    platform: string;
    platformUrl: string | null;
    publishedAt: Date | null;
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    body: string;
  }>;
}

export async function getAnalyticsSummary(organizationId: string, sinceDays = 30): Promise<AnalyticsSummary> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const posts = await db.socialPost.findMany({
    where: { organizationId, status: "PUBLISHED", publishedAt: { gte: since } },
    include: { draft: { select: { body: true } } },
    orderBy: { publishedAt: "desc" },
  });

  const totals = { impressions: 0, likes: 0, comments: 0, shares: 0, postCount: posts.length };
  const byPlatform: AnalyticsSummary["byPlatform"] = {};

  for (const post of posts) {
    const impressions = post.impressions ?? 0;
    const likes = post.likes ?? 0;
    const comments = post.comments ?? 0;
    const shares = post.shares ?? 0;

    totals.impressions += impressions;
    totals.likes += likes;
    totals.comments += comments;
    totals.shares += shares;

    const bucket = byPlatform[post.platform] ?? { impressions: 0, likes: 0, comments: 0, shares: 0, postCount: 0 };
    bucket.impressions += impressions;
    bucket.likes += likes;
    bucket.comments += comments;
    bucket.shares += shares;
    bucket.postCount += 1;
    byPlatform[post.platform] = bucket;
  }

  const topPosts = [...posts]
    .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
    .slice(0, 10)
    .map((post) => ({
      id: post.id,
      draftId: post.draftId,
      platform: post.platform,
      platformUrl: post.platformUrl,
      publishedAt: post.publishedAt,
      impressions: post.impressions ?? 0,
      likes: post.likes ?? 0,
      comments: post.comments ?? 0,
      shares: post.shares ?? 0,
      body: post.draft.body,
    }));

  return { totals, byPlatform, topPosts };
}
