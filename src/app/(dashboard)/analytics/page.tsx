import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { TrendUp, Heart, ChatCircle, ShareNetwork, Eye } from "@phosphor-icons/react/ssr";

import { requireActiveMembership } from "@/lib/auth/session";
import { refreshDueAnalytics, getAnalyticsSummary } from "@/lib/analytics/service";
import { PLATFORM_LABELS } from "@/lib/config/content";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = {
  title: "Analytics — Political Social Command Center",
};

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const { membership } = await requireActiveMembership();

  const days = RANGE_OPTIONS.some((o) => String(o.days) === daysParam) ? Number(daysParam) : 30;

  // Best-effort refresh of anything stale before rendering — capped and
  // scoped to this org, so a normal page view stays fast once the cron
  // sweep has kept things current.
  await refreshDueAnalytics(membership.organizationId);
  const summary = await getAnalyticsSummary(membership.organizationId, days);

  const kpis = [
    { label: "Impressions", value: summary.totals.impressions, icon: Eye },
    { label: "Likes", value: summary.totals.likes, icon: Heart },
    { label: "Comments", value: summary.totals.comments, icon: ChatCircle },
    { label: "Shares", value: summary.totals.shares, icon: ShareNetwork },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Engagement across every published post, {summary.totals.postCount} post
            {summary.totals.postCount === 1 ? "" : "s"} in range.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {RANGE_OPTIONS.map((opt) => (
            <Link
              key={opt.days}
              href={`/analytics?days=${opt.days}`}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                opt.days === days ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {summary.totals.postCount === 0 ? (
        <EmptyState
          icon={TrendUp}
          title="No published posts in range"
          description="Once a draft is published, its engagement numbers will appear here."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon weight="duotone" className="size-4.5" />
                  </span>
                  <div>
                    <p className="text-xl font-semibold tabular-nums">{formatNumber(value)}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By platform</CardTitle>
              <CardDescription>Totals broken down by connected platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col divide-y divide-border">
                {Object.entries(summary.byPlatform).map(([platform, stats]) => (
                  <div key={platform} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS]}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {stats.postCount} post{stats.postCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs tabular-nums text-muted-foreground">
                      <span>{formatNumber(stats.impressions)} impr.</span>
                      <span>{formatNumber(stats.likes)} likes</span>
                      <span>{formatNumber(stats.comments)} comments</span>
                      <span>{formatNumber(stats.shares)} shares</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top posts</CardTitle>
              <CardDescription>Ranked by impressions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col divide-y divide-border">
                {summary.topPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/drafts/${post.draftId}`}
                    className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-80"
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm">{post.body}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Badge variant="outline">{PLATFORM_LABELS[post.platform as keyof typeof PLATFORM_LABELS]}</Badge>
                        {post.publishedAt ? (
                          <span className="text-xs text-muted-foreground">
                            {format(post.publishedAt, "MMM d, h:mm a")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-3 text-xs tabular-nums text-muted-foreground">
                      <span>{formatNumber(post.impressions)} impr.</span>
                      <span>{formatNumber(post.likes)} likes</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
