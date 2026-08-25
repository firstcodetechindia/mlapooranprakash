/**
 * Provider-agnostic AI interface. Nothing outside /src/lib/ai should ever
 * import an OpenAI (or any other vendor) type directly — swapping
 * providers later should mean writing one new file here, not touching
 * call sites. See getAIProvider() in ./index.ts for provider selection.
 *
 * Starts minimal (embeddings only, for the Knowledge Base). Research/
 * content-generation/fact-check methods get added to this interface when
 * those agents are built, not speculatively now.
 */
export interface AIProvider {
  readonly name: string;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}
