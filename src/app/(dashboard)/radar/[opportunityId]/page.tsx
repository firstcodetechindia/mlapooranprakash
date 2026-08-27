import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";

import { requireActiveMembership } from "@/lib/auth/session";
import { getOpportunity } from "@/lib/radar/service";
import type { ResearchFact, ResearchSource } from "@/lib/research/agent";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Research — Political Social Command Center",
};

const FACT_STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  VERIFIED: { label: "Verified", variant: "default" },
  USER_PROVIDED: { label: "User-provided fact", variant: "secondary" },
  AI_INFERENCE: { label: "AI inference", variant: "outline" },
  UNVERIFIED: { label: "Unverified", variant: "destructive" },
};

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  const { membership } = await requireActiveMembership();
  const opportunity = await getOpportunity(membership.organizationId, opportunityId);

  if (!opportunity) notFound();

  const report = opportunity.researchReport;
  const facts = (report?.facts as unknown as ResearchFact[]) ?? [];
  const sources = (report?.sources as unknown as ResearchSource[]) ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/radar">
            <ArrowLeft className="size-3.5" />
            Back to Content Radar
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{opportunity.topic}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{opportunity.summary}</p>
      </div>

      {!report ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No research yet for this opportunity.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Research summary</CardTitle>
                <Badge variant={report.confidence >= 50 ? "default" : "outline"}>
                  {report.confidence}% confidence
                </Badge>
              </div>
              <CardDescription>
                Built only from approved knowledge base documents and
                monitored reference posts — nothing invented.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm">{report.summary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Facts found</CardTitle>
              <CardDescription>
                Labeled by provenance — never presented as more certain than
                it is.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {facts.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  No facts found in approved sources.
                </p>
              ) : (
                facts.map((fact, index) => (
                  <div key={index} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={FACT_STATUS_LABEL[fact.status]?.variant ?? "outline"}>
                        {FACT_STATUS_LABEL[fact.status]?.label ?? fact.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{fact.source}</span>
                    </div>
                    <p className="text-sm">{fact.statement}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {sources.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sources</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                {sources.map((source, index) => (
                  <div key={index} className="py-2 first:pt-0 last:pb-0 text-sm">
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {source.title}
                      </a>
                    ) : (
                      <span>{source.title}</span>
                    )}
                    {source.publishedAt ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {new Date(source.publishedAt).toLocaleDateString()}
                      </span>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
