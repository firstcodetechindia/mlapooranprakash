import "server-only";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { getAIProvider, isRealAIConfigured } from "@/lib/ai";
import { searchKnowledgeBase } from "@/lib/knowledge/search";
import type { FactStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export interface ResearchFact {
  statement: string;
  status: FactStatus;
  source: string;
}

export interface ResearchSource {
  title: string;
  url: string | null;
  publishedAt: string | null;
}

export interface ResearchOutput {
  topic: string;
  summary: string;
  confidence: number;
  facts: ResearchFact[];
  sources: ResearchSource[];
}

const MAX_REFERENCE_POSTS = 8;
const MAX_KNOWLEDGE_CHUNKS = 5;

/**
 * Researches a topic using only the organization's own approved data —
 * approved Knowledge Base documents (USER_PROVIDED facts) and recently
 * ingested reference posts (UNVERIFIED — external monitoring, not
 * attested by the team). Never invents a fact: anything not grounded in
 * one of those two real sources doesn't appear in the output. The
 * `summary` may reorganize/condense that material (via the AI provider,
 * constrained to only use what it's given) but introduces nothing new.
 */
export async function research(organizationId: string, topic: string): Promise<ResearchOutput> {
  const [knowledgeResults, referencePosts] = await Promise.all([
    searchKnowledgeBase(organizationId, topic, MAX_KNOWLEDGE_CHUNKS),
    db.referencePost.findMany({
      where: {
        organizationId,
        OR: [
          { title: { contains: topic, mode: "insensitive" } },
          { content: { contains: topic, mode: "insensitive" } },
        ],
      },
      include: { referenceSource: { select: { name: true } } },
      orderBy: { publishedAt: "desc" },
      take: MAX_REFERENCE_POSTS,
    }),
  ]);

  // Only chunks from APPROVED documents count as USER_PROVIDED facts —
  // pending/rejected documents haven't been signed off as safe to draw on.
  const approvedDocIds = new Set(
    (
      await db.knowledgeDocument.findMany({
        where: { organizationId, approvalStatus: "APPROVED" },
        select: { id: true },
      })
    ).map((d) => d.id),
  );

  const facts: ResearchFact[] = [];
  const sources: ResearchSource[] = [];

  for (const result of knowledgeResults) {
    if (!approvedDocIds.has(result.documentId)) continue;
    facts.push({
      statement: result.content.trim(),
      status: "USER_PROVIDED",
      source: result.documentTitle,
    });
    if (!sources.some((s) => s.title === result.documentTitle)) {
      sources.push({ title: result.documentTitle, url: null, publishedAt: null });
    }
  }

  for (const post of referencePosts) {
    if (!post.content) continue;
    facts.push({
      statement: post.content.trim(),
      status: "UNVERIFIED",
      source: post.referenceSource.name,
    });
    sources.push({
      title: post.title ?? post.referenceSource.name,
      url: post.url,
      publishedAt: post.publishedAt?.toISOString() ?? null,
    });
  }

  const verifiedCount = facts.filter((f) => f.status === "USER_PROVIDED").length;
  const confidence =
    facts.length === 0 ? 0 : Math.round((verifiedCount / facts.length) * 60 + (facts.length > 0 ? 20 : 0));

  const summary = await summarize(topic, facts);

  return { topic, summary, confidence, facts, sources };
}

async function summarize(topic: string, facts: ResearchFact[]): Promise<string> {
  if (facts.length === 0) {
    return `No approved knowledge base entries or monitored reference posts mention "${topic}" yet. Add or approve relevant source material before drafting on this topic.`;
  }

  const material = facts
    .map((f) => `[${f.status}] ${f.statement} (source: ${f.source})`)
    .join("\n");

  if (!isRealAIConfigured()) {
    // Mock mode: no summarization prose, just the material itself,
    // clearly presented as unprocessed — see MockAIProvider.generateText.
    return `Unprocessed findings on "${topic}" (mock mode — set OPENAI_API_KEY for a written summary):\n${material}`;
  }

  return getAIProvider().generateText({
    system:
      "You summarize research material for a political communications team. " +
      "ONLY restate information present in the provided material — never add facts, " +
      "statistics, dates, or claims that are not explicitly present. If the material is " +
      "thin, say so plainly rather than filling gaps. Keep it to 3-4 sentences.",
    prompt: `Topic: ${topic}\n\nMaterial:\n${material}`,
    maxTokens: 300,
  });
}

export async function saveResearchReport(
  organizationId: string,
  actorUserId: string,
  opportunityId: string | null,
  output: ResearchOutput,
) {
  const report = await db.researchReport.create({
    data: {
      organizationId,
      contentOpportunityId: opportunityId,
      topic: output.topic,
      summary: output.summary,
      confidence: output.confidence,
      facts: output.facts as unknown as Prisma.InputJsonValue,
      sources: output.sources as unknown as Prisma.InputJsonValue,
      createdById: actorUserId,
    },
  });

  if (opportunityId) {
    await db.contentOpportunity.update({
      where: { id: opportunityId },
      data: { status: "RESEARCHED" },
    });
  }

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "research_report.created",
    resourceType: "ResearchReport",
    resourceId: report.id,
    newState: { topic: output.topic, confidence: output.confidence, factCount: output.facts.length },
  });

  return report;
}
