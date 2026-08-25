"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationAccess } from "@/lib/security/authorize";
import { deleteKnowledgeDocument, setDocumentApproval } from "@/lib/knowledge/service";
import { searchKnowledgeBase, type KnowledgeSearchResult } from "@/lib/knowledge/search";

export async function deleteDocumentAction(organizationId: string, documentId: string) {
  const { session } = await requireOrganizationAccess(organizationId, "ADMIN");
  await deleteKnowledgeDocument(organizationId, session.user.id, documentId);
  revalidatePath("/knowledge");
}

export async function setApprovalAction(
  organizationId: string,
  documentId: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
) {
  const { session } = await requireOrganizationAccess(organizationId, "ADMIN");
  await setDocumentApproval(organizationId, session.user.id, documentId, status);
  revalidatePath("/knowledge");
}

export async function searchKnowledgeAction(
  organizationId: string,
  query: string,
): Promise<KnowledgeSearchResult[]> {
  await requireOrganizationAccess(organizationId, "VIEWER");
  return searchKnowledgeBase(organizationId, query);
}
