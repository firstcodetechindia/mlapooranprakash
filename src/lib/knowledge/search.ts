import "server-only";

import { db } from "@/lib/db/client";
import { getAIProvider } from "@/lib/ai";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface KnowledgeSearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
}

/**
 * Brute-force cosine similarity search across every chunk in the org.
 * Fine at the chunk volumes a single politician's office will realistically
 * upload; revisit with pgvector (or an external vector DB) once that stops
 * being true — see the note on KnowledgeChunk in schema.prisma.
 */
export async function searchKnowledgeBase(
  organizationId: string,
  query: string,
  topK = 5,
): Promise<KnowledgeSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const chunks = await db.knowledgeChunk.findMany({
    where: { organizationId, document: { status: "READY" } },
    include: { document: { select: { title: true } } },
  });
  if (chunks.length === 0) return [];

  const [queryEmbedding] = await getAIProvider().generateEmbeddings([trimmed]);

  return chunks
    .map((chunk) => ({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      documentTitle: chunk.document.title,
      content: chunk.content,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
