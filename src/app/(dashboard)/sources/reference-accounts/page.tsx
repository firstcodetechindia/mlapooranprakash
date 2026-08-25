import type { Metadata } from "next";

import { requireActiveMembership } from "@/lib/auth/session";
import { listReferenceSources } from "@/lib/sources/service";
import { hasRoleAtLeast } from "@/lib/security/authorize";
import { SourceList } from "./source-list";

export const metadata: Metadata = {
  title: "Reference Sources — Political Social Command Center",
};

export default async function ReferenceSourcesPage() {
  const { membership } = await requireActiveMembership();
  const sources = await listReferenceSources(membership.organizationId);
  const canManage = hasRoleAtLeast(membership.role, "ADMIN");
  const canFetch = hasRoleAtLeast(membership.role, "EDITOR");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reference sources</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approved public sources the team monitors for content ideas. Only
          RSS/website feeds can be fetched here — X, Facebook, and Instagram
          require official API access this app doesn&apos;t have connected
          yet.
        </p>
      </div>

      <SourceList
        organizationId={membership.organizationId}
        sources={sources}
        canManage={canManage}
        canFetch={canFetch}
      />
    </div>
  );
}
