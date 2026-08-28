import "server-only";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { scoreOpportunity } from "./score";

const LOOKBACK_DAYS = 7;
const MAX_POSTS_PER_SCAN = 100;

export function listOpportunities(organizationId: string) {
  return db.contentOpportunity.findMany({
    where: { organizationId, status: { in: ["NEW", "RESEARCHING", "RESEARCHED"] } },
    orderBy: { opportunityScore: "desc" },
    include: {
      referencePost: { include: { referenceSource: { select: { name: true, url: true } } } },
      researchReport: { select: { id: true } },
    },
  });
}

export function getOpportunity(organizationId: string, opportunityId: string) {
  return db.contentOpportunity.findFirst({
    where: { id: opportunityId, organizationId },
    include: {
      referencePost: { include: { referenceSource: true } },
      researchReport: true,
      drafts: { select: { id: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

/**
 * Scans recently ingested ReferencePosts that don't already have a
 * ContentOpportunity, scores each with the deterministic rule-based
 * engine (see score.ts), and creates opportunities above a minimum
 * threshold. Manual/on-demand for now, same as "Fetch now" on reference
 * sources — both are rate-limited per organization (see
 * src/lib/security/rate-limit.ts) rather than run on a schedule. Could
 * move to a periodic Vercel Cron sweep the same way scheduled publishing
 * does (src/app/api/cron/publish-scheduled) if this needs to run
 * unattended.
 */
export async function generateOpportunities(organizationId: string, actorUserId: string) {
  const [profile, candidatePosts] = await Promise.all([
    db.politicianProfile.findUnique({
      where: { organizationId },
      include: { constituency: true },
    }),
    db.referencePost.findMany({
      where: {
        organizationId,
        contentOpportunity: null,
        publishedAt: { gte: new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) },
      },
      include: { referenceSource: { select: { category: true, priority: true } } },
      orderBy: { publishedAt: "desc" },
      take: MAX_POSTS_PER_SCAN,
    }),
  ]);

  const context = {
    contentPillars: profile?.contentPillars ?? [],
    frequentTopics: profile?.frequentTopics ?? [],
    constituencyName: profile?.constituency?.name ?? null,
    constituencyKeyIssues: profile?.constituency?.keyIssues ?? [],
  };

  let created = 0;
  for (const post of candidatePosts) {
    const score = scoreOpportunity(
      {
        title: post.title,
        content: post.content,
        publishedAt: post.publishedAt,
        fetchedAt: post.fetchedAt,
        sourceCategory: post.referenceSource.category,
        sourcePriority: post.referenceSource.priority,
      },
      context,
    );

    if (score.opportunityScore < 30) continue;

    await db.contentOpportunity.create({
      data: {
        organizationId,
        referencePostId: post.id,
        topic: post.title?.slice(0, 200) ?? "Untitled",
        summary: (post.content ?? "").slice(0, 500),
        suggestedPlatform: score.suggestedPlatform,
        suggestedFormat: score.suggestedFormat,
        relevanceScore: score.relevanceScore,
        freshnessScore: score.freshnessScore,
        localRelevanceScore: score.localRelevanceScore,
        publicInterestScore: score.publicInterestScore,
        contentFitScore: score.contentFitScore,
        opportunityScore: score.opportunityScore,
        reasoning: score.reasoning,
      },
    });
    created += 1;
  }

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "content_opportunity.scan_completed",
    resourceType: "ContentOpportunity",
    metadata: { postsScanned: candidatePosts.length, opportunitiesCreated: created },
  });

  return { postsScanned: candidatePosts.length, opportunitiesCreated: created };
}

export async function dismissOpportunity(
  organizationId: string,
  actorUserId: string,
  opportunityId: string,
) {
  await db.contentOpportunity.findFirstOrThrow({
    where: { id: opportunityId, organizationId },
  });

  await db.contentOpportunity.update({
    where: { id: opportunityId },
    data: { status: "DISMISSED" },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "content_opportunity.dismissed",
    resourceType: "ContentOpportunity",
    resourceId: opportunityId,
  });
}
