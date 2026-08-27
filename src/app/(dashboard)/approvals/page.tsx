import type { Metadata } from "next";
import Link from "next/link";
import { Warning } from "@phosphor-icons/react/ssr";

import { requireActiveMembership } from "@/lib/auth/session";
import { listDrafts } from "@/lib/drafts/service";
import { DRAFT_STATUS_LABELS, PLATFORM_LABELS } from "@/lib/config/content";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = {
  title: "Approval Queue — Political Social Command Center",
};

export default async function ApprovalsPage() {
  const { membership } = await requireActiveMembership();
  const drafts = await listDrafts(membership.organizationId, ["FACT_CHECK", "NEEDS_REVIEW"]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approval queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drafts awaiting editorial or approver review. Nothing here can
          publish until an Approver signs off.
        </p>
      </div>

      {drafts.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Warning}
              title="Nothing awaiting approval"
              description="Generate a draft from a researched opportunity in Content Radar to see it here."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {drafts.map((draft) => {
            const hasUnverified = draft.factChecks.some(
              (f) => f.status !== "VERIFIED" && f.status !== "PARTIALLY_VERIFIED",
            );
            return (
              <Link key={draft.id} href={`/drafts/${draft.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {draft.contentOpportunity?.topic ?? "Untitled draft"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{draft.body}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">{PLATFORM_LABELS[draft.platform]}</Badge>
                        <Badge variant="secondary">{DRAFT_STATUS_LABELS[draft.status]}</Badge>
                        {hasUnverified ? (
                          <Badge variant="destructive">
                            <Warning className="size-3" />
                            Unverified claim
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {draft.createdBy?.name ?? draft.createdBy?.email ?? "AI"}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
