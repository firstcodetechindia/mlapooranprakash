import "server-only";
import OpenAI from "openai";

import type { AIProvider } from "./types";

const EMBEDDING_MODEL = "text-embedding-3-small";
const TEXT_MODEL = "gpt-4o-mini";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await this.client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  }

  async generateText({
    system,
    prompt,
    maxTokens = 500,
  }: {
    system?: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: TEXT_MODEL,
      max_completion_tokens: maxTokens,
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user" as const, content: prompt },
      ],
    });

    return response.choices[0]?.message?.content ?? "";
  }
}
