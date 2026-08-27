"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowSquareOut,
  MagnifyingGlass,
  Target,
  X,
} from "@phosphor-icons/react";

import { dismissOpportunityAction, researchOpportunityAction } from "./actions";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OpportunityRow {
  id: string;
  topic: string;
  summary: string;
  suggestedPlatform: string;
  suggestedFormat: string;
  opportunityScore: number;
  relevanceScore: number;
  freshnessScore: number;
  localRelevanceScore: number;
  publicInterestScore: number;
  contentFitScore: number;
  reasoning: string;
  status: string;
  referencePost: {
    url: string | null;
    referenceSource: { name: string; url: string };
  } | null;
  researchReport: { id: string } | null;
}

function scoreTone(score: number): string {
  if (score >= 70) return "text-primary";
  if (score >= 50) return "text-foreground";
  return "text-muted-foreground";
}

export function OpportunityList({
  organizationId,
  opportunities,
}: {
  organizationId: string;
  opportunities: OpportunityRow[];
}) {
  if (opportunities.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Target}
            title="No opportunities yet"
            description="Scan for opportunities to score your recently fetched reference posts against your content pillars and constituency."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {opportunities.map((opp) => (
        <OpportunityCard key={opp.id} organizationId={organizationId} opp={opp} />
      ))}
    </div>
  );
}

function OpportunityCard({
  organizationId,
  opp,
}: {
  organizationId: string;
  opp: OpportunityRow;
}) {
  const [dismissPending, startDismiss] = useTransition();
  const [researchPending, startResearch] = useTransition();

  function handleDismiss() {
    startDismiss(async () => {
      await dismissOpportunityAction(organizationId, opp.id);
      toast.success("Dismissed");
    });
  }

  function handleResearch() {
    startResearch(async () => {
      await researchOpportunityAction(organizationId, opp.id, opp.topic);
      toast.success("Research complete");
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{opp.topic}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{opp.summary}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{opp.suggestedPlatform}</Badge>
              <Badge variant="secondary">{opp.suggestedFormat}</Badge>
              {opp.referencePost ? (
                <a
                  href={opp.referencePost.url ?? opp.referencePost.referenceSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  {opp.referencePost.referenceSource.name}
                  <ArrowSquareOut className="size-3" />
                </a>
              ) : null}
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`shrink-0 text-2xl font-semibold tabular-nums ${scoreTone(opp.opportunityScore)}`}>
                {opp.opportunityScore}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              <div className="space-y-1 text-xs">
                <p>Relevance {opp.relevanceScore} · Freshness {opp.freshnessScore}</p>
                <p>Local {opp.localRelevanceScore} · Public interest {opp.publicInterestScore}</p>
                <p>Content fit {opp.contentFitScore}</p>
                <p className="pt-1 text-muted-foreground">{opp.reasoning}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center justify-end gap-1.5 border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={handleDismiss} disabled={dismissPending}>
            <X className="size-3.5" />
            Dismiss
          </Button>
          {opp.researchReport ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/radar/${opp.id}`}>View research</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleResearch} disabled={researchPending}>
              <MagnifyingGlass className="size-3.5" />
              {researchPending ? "Researching…" : "Research"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
