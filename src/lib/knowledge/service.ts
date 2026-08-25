import "server-only";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { getStorageProvider } from "@/lib/storage";
import { getAIProvider } from "@/lib/ai";
import { extractText, UnsupportedDocumentTypeError } from "@/lib/knowledge/parse";
import { chunkText } from "@/lib/knowledge/chunk";
import type { DocumentSourceType } from "@/lib/config/knowledge";

export function listKnowledgeDocuments(organizationId: string) {
  return db.knowledgeDocument.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { name: true, email: true } },
      _count: { select: { chunks: true } },
    },
  });
}

export function getKnowledgeDocument(organizationId: string, documentId: string) {
  return db.knowledgeDocument.findFirst({
    where: { id: documentId, organizationId },
    include: {
      uploadedBy: { select: { name: true, email: true } },
      _count: { select: { chunks: true } },
    },
  });
}

/**
 * Full upload pipeline: store the original file, extract text, chunk it,
 * embed each chunk, persist. Runs synchronously within the request — fine
 * for the document sizes this accepts (20MB cap); move to a background
 * job if upload latency becomes a problem once documents get larger or
 * more frequent.
 */
export async function ingestKnowledgeDocument(params: {
  organizationId: string;
  actorUserId: string;
  title: string;
  sourceType: DocumentSourceType;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const storage = getStorageProvider();
  const storageKey = `${params.organizationId}/${randomUUID()}-${params.fileName}`;

  const document = await db.knowledgeDocument.create({
    data: {
      organizationId: params.organizationId,
      title: params.title,
      sourceType: params.sourceType,
      fileName: params.fileName,
      mimeType: params.mimeType,
      fileSize: params.buffer.byteLength,
      storageKey,
      status: "PROCESSING",
      uploadedById: params.actorUserId,
    },
  });

  try {
    await storage.upload({
      key: storageKey,
      buffer: params.buffer,
      contentType: params.mimeType,
    });

    const text = await extractText(params.buffer, params.mimeType);
    const chunks = chunkText(text);

    if (chunks.length > 0) {
      const embeddings = await getAIProvider().generateEmbeddings(chunks);
      await db.knowledgeChunk.createMany({
        data: chunks.map((content, index) => ({
          organizationId: params.organizationId,
          documentId: document.id,
          chunkIndex: index,
          content,
          embedding: embeddings[index],
        })),
      });
    }

    await db.knowledgeDocument.update({
      where: { id: document.id },
      data: { status: "READY", extractedText: text },
    });
  } catch (error) {
    const message =
      error instanceof UnsupportedDocumentTypeError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown processing error";

    await db.knowledgeDocument.update({
      where: { id: document.id },
      data: { status: "FAILED", processingError: message },
    });
  }

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actorUserId,
    action: "knowledge_document.uploaded",
    resourceType: "KnowledgeDocument",
    resourceId: document.id,
    newState: { title: params.title, fileName: params.fileName },
  });

  return db.knowledgeDocument.findUniqueOrThrow({ where: { id: document.id } });
}

export async function setDocumentApproval(
  organizationId: string,
  actorUserId: string,
  documentId: string,
  approvalStatus: "APPROVED" | "REJECTED" | "PENDING",
) {
  const existing = await db.knowledgeDocument.findFirstOrThrow({
    where: { id: documentId, organizationId },
  });

  const document = await db.knowledgeDocument.update({
    where: { id: documentId },
    data: { approvalStatus },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "knowledge_document.approval_changed",
    resourceType: "KnowledgeDocument",
    resourceId: documentId,
    previousState: { approvalStatus: existing.approvalStatus },
    newState: { approvalStatus },
  });

  return document;
}

export async function deleteKnowledgeDocument(
  organizationId: string,
  actorUserId: string,
  documentId: string,
) {
  const existing = await db.knowledgeDocument.findFirstOrThrow({
    where: { id: documentId, organizationId },
  });

  await getStorageProvider().delete(existing.storageKey);
  await db.knowledgeDocument.delete({ where: { id: documentId } });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "knowledge_document.deleted",
    resourceType: "KnowledgeDocument",
    resourceId: documentId,
    previousState: { title: existing.title, fileName: existing.fileName },
  });
}
