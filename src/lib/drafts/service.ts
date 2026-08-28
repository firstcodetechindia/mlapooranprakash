import "server-only";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { EDITABLE_DRAFT_STATUSES } from "@/lib/config/content";

export function listDrafts(organizationId: string, statuses?: string[]) {
  return db.draft.findMany({
    where: {
      organizationId,
      ...(statuses ? { status: { in: statuses as never[] } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      factChecks: true,
      createdBy: { select: { name: true, email: true } },
      contentOpportunity: { select: { topic: true } },
    },
  });
}

export function listCalendarDrafts(organizationId: string, rangeStart: Date, rangeEnd: Date) {
  return db.draft.findMany({
    where: {
      organizationId,
      OR: [
        { status: "SCHEDULED", scheduledAt: { gte: rangeStart, lt: rangeEnd } },
        { status: "PUBLISHED", socialPost: { publishedAt: { gte: rangeStart, lt: rangeEnd } } },
      ],
    },
    include: {
      socialPost: true,
      contentOpportunity: { select: { topic: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });
}

export function getDraft(organizationId: string, draftId: string) {
  return db.draft.findFirst({
    where: { id: draftId, organizationId },
    include: {
      factChecks: true,
      revisions: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true, email: true } } } },
      createdBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      rejectedBy: { select: { name: true, email: true } },
      researchReport: true,
      contentOpportunity: { select: { topic: true } },
      socialPost: true,
    },
  });
}

export class DraftNotEditableError extends Error {
  constructor() {
    super("This draft can no longer be edited — it's already approved, scheduled, or published.");
    this.name = "DraftNotEditableError";
  }
}

export async function updateDraftBody(
  organizationId: string,
  actorUserId: string,
  draftId: string,
  body: string,
  changeType: string,
  changeSummary?: string,
) {
  const draft = await db.draft.findFirstOrThrow({ where: { id: draftId, organizationId } });
  if (!EDITABLE_DRAFT_STATUSES.includes(draft.status)) {
    throw new DraftNotEditableError();
  }

  const updated = await db.draft.update({
    where: { id: draftId },
    data: { body },
  });

  await db.draftRevision.create({
    data: {
      organizationId,
      draftId,
      body,
      changeType,
      changeSummary,
      createdById: actorUserId,
    },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "draft.edited",
    resourceType: "Draft",
    resourceId: draftId,
    metadata: { changeType, changeSummary },
  });

  return updated;
}

export async function updateDraftHashtags(
  organizationId: string,
  actorUserId: string,
  draftId: string,
  hashtags: string[],
) {
  await db.draft.findFirstOrThrow({ where: { id: draftId, organizationId } });

  const updated = await db.draft.update({
    where: { id: draftId },
    data: { hashtags },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "draft.hashtags_updated",
    resourceType: "Draft",
    resourceId: draftId,
    newState: { hashtags },
  });

  return updated;
}

export async function approveDraft(organizationId: string, actorUserId: string, draftId: string) {
  const draft = await db.draft.findFirstOrThrow({ where: { id: draftId, organizationId } });

  const updated = await db.draft.update({
    where: { id: draftId },
    data: { status: "APPROVED", approvedById: actorUserId, approvedAt: new Date() },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "draft.approved",
    resourceType: "Draft",
    resourceId: draftId,
    previousState: { status: draft.status },
    newState: { status: "APPROVED" },
  });

  return updated;
}

export async function rejectDraft(
  organizationId: string,
  actorUserId: string,
  draftId: string,
  reason: string,
) {
  const draft = await db.draft.findFirstOrThrow({ where: { id: draftId, organizationId } });

  const updated = await db.draft.update({
    where: { id: draftId },
    data: {
      status: "REJECTED",
      rejectedById: actorUserId,
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "draft.rejected",
    resourceType: "Draft",
    resourceId: draftId,
    previousState: { status: draft.status },
    newState: { status: "REJECTED", reason },
  });

  return updated;
}
