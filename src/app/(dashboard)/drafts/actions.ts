"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationAccess } from "@/lib/security/authorize";
import { generateDraft, shortenDraftBody, suggestHashtags, type GenerateDraftParams } from "@/lib/content/agent";
import { factCheckDraft } from "@/lib/factcheck/agent";
import { approveDraft, rejectDraft, updateDraftBody, updateDraftHashtags } from "@/lib/drafts/service";
import { publishDraft, scheduleDraft, unscheduleDraft } from "@/lib/social/publish";
import { enforceRateLimit } from "@/lib/security/rate-limit";

// Shared budget across every AI-triggering action (generate, shorten,
// hashtags, research) rather than one bucket per action — the thing being
// protected is the org's total AI spend, not any single feature.
const AI_RATE_LIMIT = { limit: 60, windowSeconds: 3600 };

export async function generateDraftAction(
  organizationId: string,
  params: GenerateDraftParams,
) {
  const { session } = await requireOrganizationAccess(organizationId, "EDITOR");
  await enforceRateLimit(`ai:${organizationId}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowSeconds);
  const draft = await generateDraft(organizationId, session.user.id, params);
  await factCheckDraft(organizationId, draft.id);
  revalidatePath("/radar");
  revalidatePath("/approvals");
  return draft.id;
}

export async function runFactCheckAction(organizationId: string, draftId: string) {
  await requireOrganizationAccess(organizationId, "EDITOR");
  await factCheckDraft(organizationId, draftId);
  revalidatePath(`/drafts/${draftId}`);
}

export async function saveDraftBodyAction(
  organizationId: string,
  draftId: string,
  body: string,
) {
  const { session } = await requireOrganizationAccess(organizationId, "EDITOR");
  await updateDraftBody(organizationId, session.user.id, draftId, body, "human_edit", "Manual edit");
  await factCheckDraft(organizationId, draftId);
  revalidatePath(`/drafts/${draftId}`);
}

export async function shortenDraftAction(
  organizationId: string,
  draftId: string,
  body: string,
  targetChars: number,
) {
  const { session } = await requireOrganizationAccess(organizationId, "EDITOR");
  await enforceRateLimit(`ai:${organizationId}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowSeconds);
  const shortened = await shortenDraftBody(body, targetChars);
  await updateDraftBody(organizationId, session.user.id, draftId, shortened, "ai_edit", "Shortened");
  await factCheckDraft(organizationId, draftId);
  revalidatePath(`/drafts/${draftId}`);
  return shortened;
}

export async function suggestHashtagsAction(organizationId: string, draftId: string, body: string) {
  const { session } = await requireOrganizationAccess(organizationId, "EDITOR");
  await enforceRateLimit(`ai:${organizationId}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowSeconds);
  const hashtags = await suggestHashtags(organizationId, body);
  await updateDraftHashtags(organizationId, session.user.id, draftId, hashtags);
  revalidatePath(`/drafts/${draftId}`);
  return hashtags;
}

export async function approveDraftAction(organizationId: string, draftId: string) {
  const { session } = await requireOrganizationAccess(organizationId, "APPROVER");
  await approveDraft(organizationId, session.user.id, draftId);
  revalidatePath(`/drafts/${draftId}`);
  revalidatePath("/approvals");
}

export async function rejectDraftAction(organizationId: string, draftId: string, reason: string) {
  const { session } = await requireOrganizationAccess(organizationId, "APPROVER");
  await rejectDraft(organizationId, session.user.id, draftId, reason);
  revalidatePath(`/drafts/${draftId}`);
  revalidatePath("/approvals");
}

export interface PublishActionResult {
  ok: boolean;
  error?: string;
}

export async function publishNowAction(organizationId: string, draftId: string): Promise<PublishActionResult> {
  const { session } = await requireOrganizationAccess(organizationId, "APPROVER");
  try {
    const result = await publishDraft(organizationId, draftId, session.user.id);
    revalidatePath(`/drafts/${draftId}`);
    revalidatePath("/calendar");
    if (result.status === "FAILED") {
      return { ok: false, error: result.errorMessage ?? "Publishing failed." };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Publishing failed." };
  }
}

export async function scheduleDraftAction(
  organizationId: string,
  draftId: string,
  scheduledAt: string,
): Promise<PublishActionResult> {
  const { session } = await requireOrganizationAccess(organizationId, "APPROVER");
  try {
    await scheduleDraft(organizationId, session.user.id, draftId, new Date(scheduledAt));
    revalidatePath(`/drafts/${draftId}`);
    revalidatePath("/calendar");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Scheduling failed." };
  }
}

export async function unscheduleDraftAction(organizationId: string, draftId: string) {
  const { session } = await requireOrganizationAccess(organizationId, "APPROVER");
  await unscheduleDraft(organizationId, session.user.id, draftId);
  revalidatePath(`/drafts/${draftId}`);
  revalidatePath("/calendar");
}
