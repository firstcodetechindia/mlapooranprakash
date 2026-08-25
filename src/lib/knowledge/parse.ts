import "server-only";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export class UnsupportedDocumentTypeError extends Error {
  constructor(mimeType: string) {
    super(`Unsupported document type: ${mimeType}`);
    this.name = "UnsupportedDocumentTypeError";
  }
}

const TEXT_MIME_TYPES = new Set(["text/plain", "text/csv"]);

/**
 * Extracts plain text from an uploaded document. Supported: PDF, DOCX,
 * TXT, CSV — matches the Knowledge Base upload types in the product spec.
 * Images are stored but not text-extracted (no OCR provider wired up
 * yet).
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (TEXT_MIME_TYPES.has(mimeType)) {
    return buffer.toString("utf-8");
  }

  throw new UnsupportedDocumentTypeError(mimeType);
}
