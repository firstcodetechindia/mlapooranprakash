import "server-only";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { notifyRole } from "@/lib/notifications/service";
import type { ResearchFact } from "@/lib/research/agent";

const FACTUAL_PATTERN = /\d|%|percent|crore|lakh|million|billion|km\b/i;

function wordOverlapRatio(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const wordsB = new Set(b.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  if (wordsA.size === 0) return 0;
  let shared = 0;
  for (const word of wordsA) if (wordsB.has(word)) shared += 1;
  return shared / wordsA.size;
}

/**
 * Rule-based, not AI-guessed: a draft sentence is VERIFIED only when it
 * substantially overlaps a VERIFIED/USER_PROVIDED fact from the draft's
 * linked ResearchReport. Anything that reads as a specific claim (has a
 * number, percentage, or unit) without matching one is UNVERIFIED — never
 * silently accepted. Non-factual sentences (greetings, calls to action)
 * are skipped rather than flagged.
 */
export async function factCheckDraft(organizationId: string, draftId: string) {
  const draft = await db.draft.findFirstOrThrow({
    where: { id: draftId, organizationId },
    include: { researchReport: true },
  });

  const groundedFacts = draft.researchReport
    ? ((draft.researchReport.facts as unknown as ResearchFact[]).filter(
        (f) => f.status === "VERIFIED" || f.status === "USER_PROVIDED",
      ))
    : [];

  const sentences = draft.body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  await db.factCheck.deleteMany({ where: { draftId } });

  const results: { claim: string; status: string }[] = [];

  for (const sentence of sentences) {
    let bestMatch: ResearchFact | null = null;
    let bestRatio = 0;
    for (const fact of groundedFacts) {
      const ratio = wordOverlapRatio(sentence, fact.statement);
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestMatch = fact;
      }
    }

    if (bestMatch && bestRatio >= 0.5) {
      await db.factCheck.create({
        data: {
          organizationId,
          draftId,
          claim: sentence,
          status: "VERIFIED",
          explanation: `Matches a ${bestMatch.status === "VERIFIED" ? "verified" : "user-provided"} fact from research.`,
          source: bestMatch.source,
        },
      });
      results.push({ claim: sentence, status: "VERIFIED" });
      continue;
    }

    if (FACTUAL_PATTERN.test(sentence)) {
      await db.factCheck.create({
        data: {
          organizationId,
          draftId,
          claim: sentence,
          status: "UNVERIFIED",
          explanation: "Contains a specific claim (number, date, or figure) not found in the linked research facts.",
          source: null,
        },
      });
      results.push({ claim: sentence, status: "UNVERIFIED" });
    }
  }

  const hasUnverified = results.some((r) => r.status === "UNVERIFIED");
  const wasAlreadyInReview = draft.status === "NEEDS_REVIEW";
  await db.draft.update({
    where: { id: draftId },
    data: { status: "NEEDS_REVIEW" },
  });

  await recordAuditLog({
    organizationId,
    action: "draft.fact_checked",
    resourceType: "Draft",
    resourceId: draftId,
    metadata: { claimsChecked: results.length, hasUnverified },
  });

  // Only on first entry into NEEDS_REVIEW — re-running the fact-checker
  // after every manual edit (saveDraftBodyAction, shortenDraftAction) would
  // otherwise re-notify every approver on each keystroke-driven save.
  if (!wasAlreadyInReview) {
    await notifyRole(organizationId, "APPROVER", {
      type: "DRAFT_NEEDS_REVIEW",
      title: "Draft needs review",
      body: draft.body.slice(0, 140),
      link: `/drafts/${draftId}`,
    });
  }

  return results;
}
