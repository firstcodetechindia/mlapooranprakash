import type { SourceCategory } from "@/lib/config/sources";

export interface ScoreablePost {
  title: string | null;
  content: string | null;
  publishedAt: Date | null;
  fetchedAt: Date;
  sourceCategory: SourceCategory;
  sourcePriority: number;
}

export interface ScoringContext {
  contentPillars: string[];
  frequentTopics: string[];
  constituencyName: string | null;
  constituencyKeyIssues: string[];
}

export interface OpportunityScore {
  relevanceScore: number;
  freshnessScore: number;
  localRelevanceScore: number;
  publicInterestScore: number;
  contentFitScore: number;
  opportunityScore: number;
  reasoning: string;
  suggestedPlatform: string;
  suggestedFormat: string;
  matchedKeywords: string[];
}

const CATEGORY_WEIGHT: Record<SourceCategory, number> = {
  GOVERNMENT: 90,
  GOVERNMENT_DEPARTMENT: 85,
  ADMINISTRATION: 80,
  NEWS: 75,
  LOCAL_INSTITUTION: 70,
  PUBLIC_ORGANIZATION: 65,
  POLITICIAN: 60,
  OTHER: 50,
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function textOf(post: ScoreablePost): string {
  return `${post.title ?? ""} ${post.content ?? ""}`.toLowerCase();
}

function keywordMatches(text: string, keywords: string[]): string[] {
  const found: string[] = [];
  for (const keyword of keywords) {
    const trimmed = keyword.trim().toLowerCase();
    if (trimmed && text.includes(trimmed)) found.push(keyword);
  }
  return found;
}

function scoreFreshness(post: ScoreablePost): number {
  const reference = post.publishedAt ?? post.fetchedAt;
  const hours = (Date.now() - reference.getTime()) / (1000 * 60 * 60);
  if (hours <= 6) return 100;
  if (hours <= 24) return 85;
  if (hours <= 72) return 60;
  if (hours <= 168) return 35;
  return 10;
}

function scoreKeywordOverlap(text: string, keywords: string[]): { score: number; matched: string[] } {
  if (keywords.length === 0) return { score: 40, matched: [] }; // neutral when nothing configured to compare against
  const matched = keywordMatches(text, keywords);
  if (matched.length === 0) return { score: 15, matched };
  const ratio = matched.length / keywords.length;
  return { score: clamp(30 + ratio * 70), matched };
}

function scorePublicInterest(post: ScoreablePost): number {
  const base = CATEGORY_WEIGHT[post.sourceCategory];
  const priorityAdjustment = (post.sourcePriority - 3) * 5;
  return clamp(base + priorityAdjustment);
}

function scoreContentFit(post: ScoreablePost): number {
  let score = 0;
  if (post.title && post.title.trim().length > 0) score += 30;
  const contentLength = post.content?.trim().length ?? 0;
  if (contentLength >= 50 && contentLength <= 3000) score += 50;
  else if (contentLength > 0) score += 25;
  if (post.content && post.content.trim().length > 0) score += 20;
  return clamp(score);
}

export function scoreOpportunity(post: ScoreablePost, context: ScoringContext): OpportunityScore {
  const text = textOf(post);

  const relevance = scoreKeywordOverlap(text, [...context.contentPillars, ...context.frequentTopics]);
  const local = scoreKeywordOverlap(text, [
    ...(context.constituencyName ? [context.constituencyName] : []),
    ...context.constituencyKeyIssues,
  ]);
  const freshnessScore = scoreFreshness(post);
  const publicInterestScore = scorePublicInterest(post);
  const contentFitScore = scoreContentFit(post);

  const opportunityScore = Math.round(
    relevance.score * 0.3 +
      freshnessScore * 0.2 +
      local.score * 0.2 +
      publicInterestScore * 0.15 +
      contentFitScore * 0.15,
  );

  const contentLength = post.content?.trim().length ?? 0;
  const suggestedPlatform = contentLength > 280 ? "Facebook" : "X";
  const suggestedFormat = contentLength > 280 ? "Long-form update" : "Short post";

  const reasoningParts: string[] = [];
  if (relevance.matched.length > 0) {
    reasoningParts.push(`Matches your content pillars/topics: ${relevance.matched.join(", ")}.`);
  }
  if (local.matched.length > 0) {
    reasoningParts.push(`Locally relevant: mentions ${local.matched.join(", ")}.`);
  }
  reasoningParts.push(
    freshnessScore >= 85
      ? "Very recent."
      : freshnessScore >= 60
        ? "Fairly recent."
        : "Older item — still surfaced for context.",
  );
  reasoningParts.push(
    `From a ${CATEGORY_WEIGHT[post.sourceCategory] >= 80 ? "high-authority" : "standard"} source (priority ${post.sourcePriority}/5).`,
  );

  return {
    relevanceScore: Math.round(relevance.score),
    freshnessScore,
    localRelevanceScore: Math.round(local.score),
    publicInterestScore,
    contentFitScore,
    opportunityScore,
    reasoning: reasoningParts.join(" "),
    suggestedPlatform,
    suggestedFormat,
    matchedKeywords: [...relevance.matched, ...local.matched],
  };
}
