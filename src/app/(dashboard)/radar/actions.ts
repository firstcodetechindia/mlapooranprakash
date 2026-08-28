"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationAccess } from "@/lib/security/authorize";
import { dismissOpportunity, generateOpportunities } from "@/lib/radar/service";
import { research, saveResearchReport } from "@/lib/research/agent";
import { enforceRateLimit } from "@/lib/security/rate-limit";

// Same shared per-org AI budget as src/app/(dashboard)/drafts/actions.ts —
// scanning and researching both call out to the AI provider.
const AI_RATE_LIMIT = { limit: 60, windowSeconds: 3600 };

export async function scanForOpportunitiesAction(organizationId: string) {
  const { session } = await requireOrganizationAccess(organizationId, "EDITOR");
  await enforceRateLimit(`ai:${organizationId}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowSeconds);
  const result = await generateOpportunities(organizationId, session.user.id);
  revalidatePath("/radar");
  return result;
}

export async function dismissOpportunityAction(organizationId: string, opportunityId: string) {
  const { session } = await requireOrganizationAccess(organizationId, "EDITOR");
  await dismissOpportunity(organizationId, session.user.id, opportunityId);
  revalidatePath("/radar");
}

export async function researchOpportunityAction(
  organizationId: string,
  opportunityId: string,
  topic: string,
) {
  const { session } = await requireOrganizationAccess(organizationId, "EDITOR");
  await enforceRateLimit(`ai:${organizationId}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowSeconds);
  const output = await research(organizationId, topic);
  await saveResearchReport(organizationId, session.user.id, opportunityId, output);
  revalidatePath("/radar");
  revalidatePath(`/radar/${opportunityId}`);
}
