"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationAccess } from "@/lib/security/authorize";
import { generateDraft, shortenDraftBody, suggestHashtags, type GenerateDraftParams } from "@/lib/content/agent";
import { factCheckDraft } from "@/lib/factcheck/agent";
import { approveDraft, rejectDraft, updateDraftBody, updateDraftHashtags } from "@/lib/drafts/service";

export async function generateDraftAction(
  organizationId: string,
  params: GenerateDraftParams,
) {
  const { session } = await requireOrganizationAccess(organizationId, "EDITOR");
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
  const shortened = await shortenDraftBody(body, targetChars);
  await updateDraftBody(organizationId, session.user.id, draftId, shortened, "ai_edit", "Shortened");
  await factCheckDraft(organizationId, draftId);
  revalidatePath(`/drafts/${draftId}`);
  return shortened;
}

export async function suggestHashtagsAction(organizationId: string, draftId: string, body: string) {
  const { session } = await requireOrganizationAccess(organizationId, "EDITOR");
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
