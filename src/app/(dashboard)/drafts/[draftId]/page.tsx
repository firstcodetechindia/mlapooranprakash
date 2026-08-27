import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireActiveMembership } from "@/lib/auth/session";
import { getDraft } from "@/lib/drafts/service";
import { hasRoleAtLeast } from "@/lib/security/authorize";
import { DraftEditor } from "./draft-editor";

export const metadata: Metadata = {
  title: "Edit Draft — Political Social Command Center",
};

export default async function DraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const { membership } = await requireActiveMembership();
  const draft = await getDraft(membership.organizationId, draftId);

  if (!draft) notFound();

  return (
    <DraftEditor
      organizationId={membership.organizationId}
      draft={draft}
      canEdit={hasRoleAtLeast(membership.role, "EDITOR")}
      canApprove={hasRoleAtLeast(membership.role, "APPROVER")}
    />
  );
}
