import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "@phosphor-icons/react/ssr";

import { requireActiveMembership } from "@/lib/auth/session";
import { listAuditLogs } from "@/lib/audit/list";
import { requireOrganizationAccess } from "@/lib/security/authorize";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = {
  title: "Audit Log — Political Social Command Center",
};

function formatDiff(previous: unknown, next: unknown): string | null {
  if (!previous && !next) return null;
  const parts: string[] = [];
  if (previous) parts.push(`was: ${JSON.stringify(previous)}`);
  if (next) parts.push(`now: ${JSON.stringify(next)}`);
  return parts.join(" — ");
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { membership } = await requireActiveMembership();
  await requireOrganizationAccess(membership.organizationId, "ADMIN");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { entries, total, pageCount } = await listAuditLogs(membership.organizationId, page);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every sensitive action taken in this organization — {total} entr
          {total === 1 ? "y" : "ies"} total. Immutable: nothing in this app
          can edit or delete a row here.
        </p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={ShieldCheck}
              title="No activity yet"
              description="Actions like sign-ins, approvals, and configuration changes will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border">
            {entries.map((entry) => {
              const diff = formatDiff(entry.previousState, entry.newState);
              return (
                <div key={entry.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {entry.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {entry.resourceType}
                      {entry.resourceId ? ` · ${entry.resourceId.slice(0, 8)}` : ""}
                    </span>
                  </div>
                  <p className="text-sm">
                    {entry.user?.name ?? entry.user?.email ?? "System"} ·{" "}
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                  {diff ? (
                    <p className="truncate font-mono text-xs text-muted-foreground">{diff}</p>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {pageCount > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
            {page > 1 ? <Link href={`/audit?page=${page - 1}`}>Previous</Link> : <span>Previous</span>}
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} asChild={page < pageCount}>
            {page < pageCount ? <Link href={`/audit?page=${page + 1}`}>Next</Link> : <span>Next</span>}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
