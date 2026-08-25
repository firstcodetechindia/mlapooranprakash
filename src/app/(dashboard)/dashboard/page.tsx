import type { Metadata } from "next";
import {
  Radar,
  CheckSquare,
  CalendarClock,
  TrendingUp,
  Newspaper,
} from "lucide-react";

import { requireActiveMembership } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/config/roles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = {
  title: "Today — Political Social Command Center",
};

export default async function DashboardPage() {
  const { session, membership } = await requireActiveMembership();
  const firstName = session.user.name?.split(" ")[0] ?? session.user.email;

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
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Radar className="size-4 text-primary" />
              <CardTitle className="text-base">Content Opportunities</CardTitle>
            </div>
            <CardDescription>
              Topics worth posting about, surfaced from your approved sources.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Radar}
              title="No opportunities yet"
              description="Connect reference sources and your knowledge base to start discovering content opportunities."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckSquare className="size-4 text-primary" />
              <CardTitle className="text-base">Approval Queue</CardTitle>
            </div>
            <CardDescription>
              Drafts awaiting editorial or approver review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={CheckSquare}
              title="Nothing awaiting approval"
              description="AI-generated drafts will land here once content generation is enabled."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" />
              <CardTitle className="text-base">Schedule</CardTitle>
            </div>
            <CardDescription>
              Approved, scheduled, and published posts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={CalendarClock}
              title="Nothing scheduled"
              description="Once posts are approved, their timeline will appear here."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <CardTitle className="text-base">Performance</CardTitle>
            </div>
            <CardDescription>
              Impressions, engagement, and follower growth across platforms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={TrendingUp}
              title="No analytics yet"
              description="Connect a social account to start collecting performance data."
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Newspaper className="size-4 text-primary" />
              <CardTitle className="text-base">Content Radar</CardTitle>
            </div>
            <CardDescription>
              Local issues, government updates, public events, and reference-account inspiration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Newspaper}
              title="Radar is idle"
              description="Add reference sources and RSS feeds in Settings to start monitoring public information."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
