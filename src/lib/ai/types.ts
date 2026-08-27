/**
 * Provider-agnostic AI interface. Nothing outside /src/lib/ai should ever
 * import an OpenAI (or any other vendor) type directly — swapping
 * providers later should mean writing one new file here, not touching
 * call sites. See getAIProvider() in ./index.ts for provider selection.
 *
 * Grows as agents that need it get built (embeddings for the Knowledge
 * Base, generateText for the Research Agent) rather than speculatively
 * up front. Content-generation/fact-check methods land when those agents
 * are built.
 */
export interface AIProvider {
  readonly name: string;
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * A single system+user text completion. Callers are responsible for
   * constraining the prompt so the model only transforms/summarizes
   * material it's given — this interface has no built-in guarantee
   * against invention, that responsibility lives in the agent (e.g.
   * ResearchAgent) that constructs the prompt.
   */
  generateText(params: { system?: string; prompt: string; maxTokens?: number }): Promise<string>;
}
