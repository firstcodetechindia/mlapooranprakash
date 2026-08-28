import type { Metadata } from "next";
import Link from "next/link";
import {
  Target,
  CheckSquare,
  CalendarBlank,
  TrendUp,
  Newspaper,
} from "@phosphor-icons/react/ssr";

import { requireActiveMembership } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/config/roles";
import { listOpportunities } from "@/lib/radar/service";
import { listDrafts, listCalendarDrafts } from "@/lib/drafts/service";
import { getAnalyticsSummary } from "@/lib/analytics/service";
import { DRAFT_STATUS_LABELS, PLATFORM_LABELS } from "@/lib/config/content";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AnimatedCard } from "@/components/dashboard/animated-card";

export const metadata: Metadata = {
  title: "Today — Political Social Command Center",
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default async function DashboardPage() {
  const { session, membership } = await requireActiveMembership();
  const firstName = session.user.name?.split(" ")[0] ?? session.user.email;
  const opportunities = await listOpportunities(membership.organizationId);
  const topOpportunities = opportunities.slice(0, 4);
  const pendingDrafts = await listDrafts(membership.organizationId, ["FACT_CHECK", "NEEDS_REVIEW"]);

  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const upcoming = (await listCalendarDrafts(membership.organizationId, now, monthEnd))
    .filter((d) => d.status === "SCHEDULED")
    .slice(0, 4);

  const analyticsSummary = await getAnalyticsSummary(membership.organizationId, 30);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {ROLE_LABELS[membership.role]} · {membership.organizationName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is your team&apos;s command center. Content opportunities,
          drafts, and analytics will appear here as you complete onboarding.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AnimatedCard index={0}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target weight="duotone" className="size-4 text-primary" />
                <CardTitle className="text-base">Content Opportunities</CardTitle>
              </div>
              <CardDescription>
                Topics worth posting about, surfaced from your approved sources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topOpportunities.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="No opportunities yet"
                  description="Connect reference sources and your knowledge base to start discovering content opportunities."
                />
              ) : (
                <div className="divide-y divide-border">
                  {topOpportunities.map((opp) => (
                    <Link
                      key={opp.id}
                      href={`/radar/${opp.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-80"
                    >
                      <span className="truncate text-sm">{opp.topic}</span>
                      <Badge variant="secondary" className="shrink-0 tabular-nums">
                        {opp.opportunityScore}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard index={1}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckSquare weight="duotone" className="size-4 text-primary" />
                <CardTitle className="text-base">Approval Queue</CardTitle>
              </div>
              <CardDescription>
                Drafts awaiting editorial or approver review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingDrafts.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  title="Nothing awaiting approval"
                  description="Generate a draft from a researched opportunity in Content Radar to see it here."
                />
              ) : (
                <div className="divide-y divide-border">
                  {pendingDrafts.slice(0, 4).map((draft) => (
                    <Link
                      key={draft.id}
                      href={`/drafts/${draft.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-80"
                    >
                      <span className="truncate text-sm">
                        {draft.contentOpportunity?.topic ?? "Untitled draft"}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge variant="outline">{PLATFORM_LABELS[draft.platform]}</Badge>
                        <Badge variant="secondary">{DRAFT_STATUS_LABELS[draft.status]}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard index={2}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarBlank weight="duotone" className="size-4 text-primary" />
                <CardTitle className="text-base">Schedule</CardTitle>
              </div>
              <CardDescription>
                Approved, scheduled, and published posts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={CalendarBlank}
                  title="Nothing scheduled"
                  description="Once posts are approved, their timeline will appear here."
                />
              ) : (
                <div className="divide-y divide-border">
                  {upcoming.map((draft) => (
                    <Link
                      key={draft.id}
                      href={`/drafts/${draft.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-80"
                    >
                      <span className="truncate text-sm">{draft.body}</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge variant="outline">{PLATFORM_LABELS[draft.platform]}</Badge>
                        {draft.scheduledAt ? (
                          <span className="text-xs text-muted-foreground">
                            {new Date(draft.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard index={3}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendUp weight="duotone" className="size-4 text-primary" />
                <CardTitle className="text-base">Performance</CardTitle>
              </div>
              <CardDescription>
                Impressions, engagement, and follower growth across platforms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsSummary.totals.postCount === 0 ? (
                <EmptyState
                  icon={TrendUp}
                  title="No analytics yet"
                  description="Connect a social account to start collecting performance data."
                />
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xl font-semibold tabular-nums">
                      {formatNumber(analyticsSummary.totals.impressions)}
                    </p>
                    <p className="text-xs text-muted-foreground">Impressions, last 30 days</p>
                  </div>
                  <Link href="/analytics" className="text-sm text-primary hover:underline">
                    View analytics
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard index={4} className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Newspaper weight="duotone" className="size-4 text-primary" />
                <CardTitle className="text-base">Content Radar</CardTitle>
              </div>
              <CardDescription>
                Local issues, government updates, public events, and reference-account inspiration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {opportunities.length === 0 ? (
                <EmptyState
                  icon={Newspaper}
                  title="Radar is idle"
                  description="Add reference sources and RSS feeds, then scan for opportunities from Content Radar."
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {opportunities.length} active opportunit
                  {opportunities.length === 1 ? "y" : "ies"} —{" "}
                  <Link href="/radar" className="text-primary hover:underline">
                    view all in Content Radar
                  </Link>
                  .
                </p>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>
    </div>
  );
}
