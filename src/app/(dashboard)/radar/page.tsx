import type { Metadata } from "next";

import { requireActiveMembership } from "@/lib/auth/session";
import { listOpportunities } from "@/lib/radar/service";
import { hasRoleAtLeast } from "@/lib/security/authorize";
import { isRealAIConfigured } from "@/lib/ai";
import { OpportunityList } from "./opportunity-list";
import { ScanButton } from "./scan-button";

export const metadata: Metadata = {
  title: "Content Radar — Political Social Command Center",
};

export default async function ContentRadarPage() {
  const { membership } = await requireActiveMembership();
  const opportunities = await listOpportunities(membership.organizationId);
  const canScan = hasRoleAtLeast(membership.role, "EDITOR");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content radar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Topics worth posting about, scored from your reference sources
            against your content pillars and constituency.
          </p>
        </div>
        {canScan ? <ScanButton organizationId={membership.organizationId} /> : null}
      </div>

      {!isRealAIConfigured() ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Scoring itself is rule-based (recency, keyword overlap, source
          authority) and works fully without any AI key. Research summaries
          are running in mock mode — unprocessed findings instead of
          written prose. Set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            OPENAI_API_KEY
          </code>{" "}
          for real summaries.
        </div>
      ) : null}

      <OpportunityList organizationId={membership.organizationId} opportunities={opportunities} />
    </div>
  );
}
