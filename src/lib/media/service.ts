import "server-only";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { getStorageProvider } from "@/lib/storage";
import { mediaTypeFromMime } from "@/lib/config/media";

export function listMedia(organizationId: string) {
  return db.mediaAsset.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true, email: true } } },
  });
}

export function getMediaAsset(organizationId: string, assetId: string) {
  return db.mediaAsset.findFirst({ where: { id: assetId, organizationId } });
}

export async function uploadMedia(params: {
  organizationId: string;
  actorUserId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  tags: string[];
  altText?: string;
}) {
  const storageKey = `${params.organizationId}/media/${randomUUID()}-${params.fileName}`;

  await getStorageProvider().upload({
    key: storageKey,
    buffer: params.buffer,
    contentType: params.mimeType,
  });

  const asset = await db.mediaAsset.create({
    data: {
      organizationId: params.organizationId,
      fileName: params.fileName,
      mimeType: params.mimeType,
      fileSize: params.buffer.byteLength,
      storageKey,
      mediaType: mediaTypeFromMime(params.mimeType),
      tags: params.tags,
      altText: params.altText,
      uploadedById: params.actorUserId,
    },
  });

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actorUserId,
    action: "media_asset.uploaded",
    resourceType: "MediaAsset",
    resourceId: asset.id,
    newState: { fileName: asset.fileName, mediaType: asset.mediaType },
  });

  return asset;
}

export async function deleteMedia(organizationId: string, actorUserId: string, assetId: string) {
  const existing = await db.mediaAsset.findFirstOrThrow({
    where: { id: assetId, organizationId },
  });

  await getStorageProvider().delete(existing.storageKey);
  await db.mediaAsset.delete({ where: { id: assetId } });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "media_asset.deleted",
    resourceType: "MediaAsset",
    resourceId: assetId,
    previousState: { fileName: existing.fileName },
  });
}
