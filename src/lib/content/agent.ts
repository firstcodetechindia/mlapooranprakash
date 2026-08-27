import "server-only";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { getAIProvider, isRealAIConfigured } from "@/lib/ai";
import type { ResearchFact } from "@/lib/research/agent";
import type { Platform, ContentLanguage, Tone } from "@/generated/prisma/enums";

const PLATFORM_LIMITS: Record<Platform, { maxChars: number; format: string }> = {
  X: { maxChars: 280, format: "Short post" },
  FACEBOOK: { maxChars: 2000, format: "Long-form update" },
  INSTAGRAM: { maxChars: 2200, format: "Caption" },
};

export interface GenerateDraftParams {
  researchReportId: string;
  contentOpportunityId?: string | null;
  platform: Platform;
  language: ContentLanguage;
  tone: Tone;
}

/**
 * Writes an original draft grounded ONLY in VERIFIED/USER_PROVIDED facts
 * from the linked ResearchReport — UNVERIFIED facts inform topical
 * awareness but are never asserted as claims. The politician's voice
 * (common phrases, words to avoid, hashtag preferences) comes from
 * PoliticianProfile, not guessed.
 */
export async function generateDraft(
  organizationId: string,
  actorUserId: string,
  params: GenerateDraftParams,
) {
  const [report, profile] = await Promise.all([
    db.researchReport.findFirstOrThrow({
      where: { id: params.researchReportId, organizationId },
    }),
    db.politicianProfile.findUnique({ where: { organizationId } }),
  ]);

  const facts = report.facts as unknown as ResearchFact[];
  const groundedFacts = facts.filter(
    (f) => f.status === "VERIFIED" || f.status === "USER_PROVIDED",
  );
  const limits = PLATFORM_LIMITS[params.platform];

  const { body, hashtags } = await draftBody({
    topic: report.topic,
    summary: report.summary,
    groundedFacts,
    platform: params.platform,
    language: params.language,
    tone: params.tone,
    maxChars: limits.maxChars,
    profile,
  });

  const draft = await db.draft.create({
    data: {
      organizationId,
      researchReportId: report.id,
      contentOpportunityId: params.contentOpportunityId ?? null,
      platform: params.platform,
      format: limits.format,
      language: params.language,
      tone: params.tone,
      body,
      hashtags,
      status: "DRAFT",
      createdById: actorUserId,
    },
  });

  await db.draftRevision.create({
    data: {
      organizationId,
      draftId: draft.id,
      body,
      changeType: "ai_generated",
      changeSummary: isRealAIConfigured() ? "Initial AI draft" : "Initial draft (mock mode)",
    },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "draft.generated",
    resourceType: "Draft",
    resourceId: draft.id,
    newState: { platform: params.platform, language: params.language, tone: params.tone },
  });

  return draft;
}

interface DraftBodyParams {
  topic: string;
  summary: string;
  groundedFacts: ResearchFact[];
  platform: Platform;
  language: ContentLanguage;
  tone: Tone;
  maxChars: number;
  profile: { hashtagPreferences: string[]; commonPhrases: string[]; wordsToAvoid: string[] } | null;
}

async function draftBody(params: DraftBodyParams): Promise<{ body: string; hashtags: string[] }> {
  const hashtags = (params.profile?.hashtagPreferences ?? []).slice(0, 3);

  if (!isRealAIConfigured()) {
    return { body: buildMockDraft(params), hashtags };
  }

  const factLines = params.groundedFacts.map((f) => `- ${f.statement}`).join("\n");
  const avoid = params.profile?.wordsToAvoid.length
    ? `Never use these words/phrases: ${params.profile.wordsToAvoid.join(", ")}.`
    : "";
  const phrases = params.profile?.commonPhrases.length
    ? `Where natural, favor phrases this office already uses: ${params.profile.commonPhrases.join(", ")}.`
    : "";

  const prompt = [
    `Write an original social media post about: ${params.topic}`,
    `Platform: ${params.platform} (max ${params.maxChars} characters). Language: ${params.language}. Tone: ${params.tone}.`,
    factLines
      ? `Use ONLY these confirmed facts — do not add any statistic, date, quote, or claim not listed here:\n${factLines}`
      : "No confirmed facts are available — write a general, non-specific topical post without stating any facts, dates, or figures.",
    avoid,
    phrases,
    "Do not use hashtags in the body — those are added separately. Return only the post text, nothing else.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const text = await getAIProvider().generateText({
    system:
      "You are drafting an original social media post for a political communications team. " +
      "Never invent facts, statistics, quotes, or events beyond what's explicitly provided. " +
      "Never use inflammatory, abusive, or defamatory language.",
    prompt,
    maxTokens: 400,
  });

  return { body: text.trim().slice(0, params.maxChars), hashtags };
}

function buildMockDraft(params: DraftBodyParams): string {
  const lead = params.groundedFacts[0]?.statement ?? params.summary;
  const phrase = params.profile?.commonPhrases[0];
  const parts = [lead.trim()];
  if (phrase) parts.push(phrase);
  const body = parts.join(" ");
  return body.length > params.maxChars ? `${body.slice(0, params.maxChars - 1)}…` : body;
}

/**
 * Shortens a draft while preserving its claims. In mock mode this is a
 * word-boundary truncation (never rewrites, so it can't introduce a new
 * claim); with a real provider it's an actual rewrite constrained to only
 * remove/condense, never add.
 */
export async function shortenDraftBody(body: string, targetChars: number): Promise<string> {
  if (body.length <= targetChars) return body;

  if (!isRealAIConfigured()) {
    const truncated = body.slice(0, targetChars);
    const lastSpace = truncated.lastIndexOf(" ");
    return `${truncated.slice(0, lastSpace > 0 ? lastSpace : targetChars)}…`;
  }

  const text = await getAIProvider().generateText({
    system:
      "You shorten social media posts. Only remove or condense words — never add a new fact, " +
      "statistic, or claim that wasn't already present. Preserve the core message.",
    prompt: `Shorten this to under ${targetChars} characters:\n\n${body}`,
    maxTokens: 200,
  });

  return text.trim().slice(0, targetChars);
}

/**
 * Suggests hashtags. Mock mode extracts capitalized/topical words already
 * present in the body plus the politician's configured preferences —
 * nothing invented. Real mode asks the AI for short, relevant tags but
 * still seeds it with the same configured preferences.
 */
export async function suggestHashtags(
  organizationId: string,
  body: string,
): Promise<string[]> {
  const profile = await db.politicianProfile.findUnique({ where: { organizationId } });
  const preferred = profile?.hashtagPreferences ?? [];

  if (!isRealAIConfigured()) {
    const words = body.match(/\b[A-Z][a-zA-Z]{3,}\b/g) ?? [];
    const derived = [...new Set(words)].slice(0, 3).map((w) => `#${w}`);
    return [...new Set([...preferred, ...derived])].slice(0, 5);
  }

  const text = await getAIProvider().generateText({
    system:
      "Suggest 3-5 short, relevant hashtags for the given social media post. " +
      "Return only the hashtags separated by spaces, nothing else.",
    prompt: `Post:\n${body}\n\nThis office's preferred hashtags (reuse if relevant): ${preferred.join(", ") || "none configured"}`,
    maxTokens: 60,
  });

  const suggested = text.match(/#\w+/g) ?? [];
  return [...new Set([...preferred, ...suggested])].slice(0, 5);
}
