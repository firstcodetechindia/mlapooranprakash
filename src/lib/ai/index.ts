import "server-only";

import type { AIProvider } from "./types";
import { MockAIProvider } from "./mock-provider";
import { OpenAIProvider } from "./openai-provider";

export type { AIProvider };

let cached: AIProvider | null = null;

/**
 * The only place in the app that decides which AI provider is active.
 * Everything else calls getAIProvider().generateEmbeddings(...) and never
 * knows or cares whether that's OpenAI or the deterministic mock.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const apiKey = process.env.OPENAI_API_KEY;
  cached = apiKey ? new OpenAIProvider(apiKey) : new MockAIProvider();
  return cached;
}

export function isRealAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
