"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationAccess } from "@/lib/security/authorize";
import { dismissOpportunity, generateOpportunities } from "@/lib/radar/service";
import { research, saveResearchReport } from "@/lib/research/agent";

export async function scanForOpportunitiesAction(organizationId: string) {
  const { session } = await requireOrganizationAccess(organizationId, "EDITOR");
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
  const output = await research(organizationId, topic);
  await saveResearchReport(organizationId, session.user.id, opportunityId, output);
  revalidatePath("/radar");
  revalidatePath(`/radar/${opportunityId}`);
}
