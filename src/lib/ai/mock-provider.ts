import "server-only";
import { createHash } from "node:crypto";

import type { AIProvider } from "./types";

// Matches OpenAI's text-embedding-3-small dimensionality so switching to
// the real provider never requires a schema/column-size change.
const EMBEDDING_DIMENSIONS = 1536;

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic (same text -> same vector), text-derived pseudo-embedding.
 * Not semantically meaningful — it does NOT understand language — but it
 * is stable and text-sensitive enough that cosine similarity produces
 * consistent, testable rankings for the Knowledge Base search UI without
 * an OpenAI key. Swap to OpenAIEmbeddingsProvider once OPENAI_API_KEY is
 * set (see getAIProvider()).
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.embedOne(text));
  }

  private embedOne(text: string): number[] {
    const hash = createHash("sha256").update(text).digest();
    const seed = hash.readUInt32LE(0);
    const rand = mulberry32(seed);

    const vector = new Array<number>(EMBEDDING_DIMENSIONS);
    for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
      vector[i] = rand() * 2 - 1;
    }

    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map((v) => v / magnitude);
  }

  /**
   * Deliberately NOT a language model — it never adds a single word that
   * wasn't already in the prompt. It extracts the first few sentences,
   * which is a safe (if crude) stand-in for summarization: callers like
   * ResearchAgent already guarantee the prompt contains only verified
   * material, so "return some of what you gave me" can't invent a fact.
   * Real summarization requires OPENAI_API_KEY (see OpenAIProvider).
   */
  async generateText({ prompt, maxTokens = 200 }: { system?: string; prompt: string; maxTokens?: number }): Promise<string> {
    const approxCharBudget = maxTokens * 4;
    const sentences = prompt.split(/(?<=[.!?])\s+/).filter(Boolean);

    let result = "";
    for (const sentence of sentences) {
      if (result.length + sentence.length > approxCharBudget) break;
      result += (result ? " " : "") + sentence;
    }

    return result || prompt.slice(0, approxCharBudget);
  }
}
