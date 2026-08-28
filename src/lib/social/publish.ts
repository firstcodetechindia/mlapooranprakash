import "server-only";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { notifyUser, notifyRole } from "@/lib/notifications/service";
import { getSocialProvider } from "./index";

export class DraftNotApprovedError extends Error {
  constructor() {
    super("Only an APPROVED draft can be scheduled or published.");
    this.name = "DraftNotApprovedError";
  }
}

export class NoConnectedAccountError extends Error {
  constructor(platform: string) {
    super(`No ${platform} account is connected. Connect one in Settings → Integrations first.`);
    this.name = "NoConnectedAccountError";
  }
}

export async function scheduleDraft(
  organizationId: string,
  actorUserId: string,
  draftId: string,
  scheduledAt: Date,
) {
  const draft = await db.draft.findFirstOrThrow({ where: { id: draftId, organizationId } });
  if (draft.status !== "APPROVED") throw new DraftNotApprovedError();

  const updated = await db.draft.update({
    where: { id: draftId },
    data: { status: "SCHEDULED", scheduledAt },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "draft.scheduled",
    resourceType: "Draft",
    resourceId: draftId,
    newState: { scheduledAt: scheduledAt.toISOString() },
  });

  return updated;
}

export async function unscheduleDraft(organizationId: string, actorUserId: string, draftId: string) {
  const draft = await db.draft.findFirstOrThrow({ where: { id: draftId, organizationId } });
  if (draft.status !== "SCHEDULED") return draft;

  const updated = await db.draft.update({
    where: { id: draftId },
    data: { status: "APPROVED", scheduledAt: null },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "draft.unscheduled",
    resourceType: "Draft",
    resourceId: draftId,
  });

  return updated;
}

/**
 * Idempotent: checks for an existing SocialPost (unique per draftId)
 * before ever calling the provider, so a retry — or a cron tick that
 * overlaps a manual "Publish now" click — can never post twice. Approved
 * status is re-checked here too, not just at the call site, since this
 * also runs from the unattended cron path.
 */
export async function publishDraft(
  organizationId: string,
  draftId: string,
  actorUserId: string | null,
) {
  // Idempotent only for an already-successful publish — a FAILED row is a
  // record of the last attempt, not a lock, so a retry is allowed to
  // replace it. Without this distinction, "Retry" on a failed publish
  // would silently do nothing and just hand back the same failure.
  const existingPost = await db.socialPost.findUnique({ where: { draftId } });
  if (existingPost && existingPost.status === "PUBLISHED") return existingPost;

  const draft = await db.draft.findFirstOrThrow({ where: { id: draftId, organizationId } });
  if (draft.status !== "APPROVED" && draft.status !== "SCHEDULED" && draft.status !== "FAILED") {
    throw new DraftNotApprovedError();
  }

  const account = await db.socialAccount.findUnique({
    where: { organizationId_platform: { organizationId, platform: draft.platform } },
  });
  if (!account || account.status !== "CONNECTED") {
    throw new NoConnectedAccountError(draft.platform);
  }

  const provider = getSocialProvider(draft.platform);
  const content = { text: [draft.body, ...draft.hashtags].filter(Boolean).join(" ") };

  try {
    const result = await provider.publishPost(account, content);

    const publishedData = {
      organizationId,
      draftId,
      socialAccountId: account.id,
      platform: draft.platform,
      platformPostId: result.platformPostId,
      platformUrl: result.url,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      errorMessage: null,
    };
    const socialPost = await db.socialPost.upsert({
      where: { draftId },
      create: publishedData,
      update: publishedData,
    });

    await db.draft.update({ where: { id: draftId }, data: { status: "PUBLISHED" } });

    await recordAuditLog({
      organizationId,
      userId: actorUserId,
      action: "draft.published",
      resourceType: "Draft",
      resourceId: draftId,
      newState: { platformPostId: result.platformPostId, platform: draft.platform },
    });

    if (draft.createdById !== actorUserId) {
      await notifyUser(organizationId, draft.createdById, {
        type: "DRAFT_PUBLISHED",
        title: "Draft published",
        body: draft.body.slice(0, 140),
        link: `/drafts/${draftId}`,
      });
    }

    return socialPost;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown publishing error";

    const failedData = {
      organizationId,
      draftId,
      socialAccountId: account.id,
      platform: draft.platform,
      status: "FAILED" as const,
      errorMessage: message,
    };
    const socialPost = await db.socialPost.upsert({
      where: { draftId },
      create: failedData,
      update: failedData,
    });

    await db.draft.update({ where: { id: draftId }, data: { status: "FAILED" } });

    await recordAuditLog({
      organizationId,
      userId: actorUserId,
      action: "draft.publish_failed",
      resourceType: "Draft",
      resourceId: draftId,
      metadata: { error: message },
    });

    // Actionable, not just informational — a failed publish needs an
    // Approver to hit Retry, so this goes to the role that can act on it
    // rather than just the original actor (who may have been the cron).
    await notifyRole(organizationId, "APPROVER", {
      type: "DRAFT_PUBLISH_FAILED",
      title: "Publishing failed",
      body: message,
      link: `/drafts/${draftId}`,
    });

    return socialPost;
  }
}

/**
 * The cron entry point (see /api/cron/publish-scheduled). Vercel serverless
 * can't run a persistent worker, so this is invoked periodically by Vercel
 * Cron rather than a BullMQ delayed job — see docs/deployment.md. Safe to
 * call as often as needed: publishDraft() is idempotent per draft.
 *
 * On Vercel's Hobby plan, cron jobs are capped at once per day (see
 * vercel.json), so a post scheduled for a specific time of day can publish
 * up to ~24h late — upgrade to Pro (or trigger this route from an external
 * scheduler) for anything closer to real-time. See docs/deployment.md.
 */
export async function runScheduledPublishing() {
  const due = await db.draft.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
  });

  const results = [];
  for (const draft of due) {
    const result = await publishDraft(draft.organizationId, draft.id, null);
    results.push({ draftId: draft.id, status: result.status });
  }
  return results;
}
