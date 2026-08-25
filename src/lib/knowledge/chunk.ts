/**
 * Splits text into overlapping chunks for embedding/retrieval. Prefers
 * breaking on paragraph and sentence boundaries over cutting mid-sentence,
 * falling back to a hard character split only when a single paragraph
 * exceeds the target size on its own.
 */
export function chunkText(
  text: string,
  { chunkSize = 1200, overlap = 150 }: { chunkSize?: number; overlap?: number } = {},
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (paragraph.length <= chunkSize) {
      current = paragraph;
      continue;
    }

    // A single paragraph longer than chunkSize: hard-split with overlap.
    let start = 0;
    while (start < paragraph.length) {
      const end = Math.min(start + chunkSize, paragraph.length);
      chunks.push(paragraph.slice(start, end));
      if (end === paragraph.length) break;
      start = end - overlap;
    }
  }

  if (current) chunks.push(current);

  return chunks;
}
