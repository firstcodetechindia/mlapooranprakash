import "server-only";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { ALL_CATEGORIES, ALL_FREQUENCIES, ALL_PLATFORMS } from "@/lib/config/sources";
import type { SourceCategory, SourcePlatform, MonitoringFrequency } from "@/lib/config/sources";

export const referenceSourceSchema = z.object({
  name: z.string().trim().min(1).max(150),
  platform: z.enum(ALL_PLATFORMS as [SourcePlatform, ...SourcePlatform[]]),
  category: z.enum(ALL_CATEGORIES as [SourceCategory, ...SourceCategory[]]),
  handle: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  url: z.string().trim().min(1).max(500).url("Enter a valid URL"),
  priority: z.number().int().min(1).max(5),
  monitoringFrequency: z.enum(ALL_FREQUENCIES as [MonitoringFrequency, ...MonitoringFrequency[]]),
});

export type ReferenceSourceInput = z.infer<typeof referenceSourceSchema>;

export function listReferenceSources(organizationId: string) {
  return db.referenceSource.findMany({
    where: { organizationId },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { referencePosts: true } } },
  });
}

export async function createReferenceSource(
  organizationId: string,
  actorUserId: string,
  input: ReferenceSourceInput,
) {
  const source = await db.referenceSource.create({
    data: { organizationId, ...input },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "reference_source.created",
    resourceType: "ReferenceSource",
    resourceId: source.id,
    newState: { name: source.name, platform: source.platform, url: source.url },
  });

  return source;
}

export async function updateReferenceSource(
  organizationId: string,
  actorUserId: string,
  sourceId: string,
  input: ReferenceSourceInput,
) {
  const existing = await db.referenceSource.findFirstOrThrow({
    where: { id: sourceId, organizationId },
  });

  const source = await db.referenceSource.update({
    where: { id: sourceId },
    data: input,
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "reference_source.updated",
    resourceType: "ReferenceSource",
    resourceId: source.id,
    previousState: { name: existing.name, url: existing.url },
    newState: { name: source.name, url: source.url },
  });

  return source;
}

export async function setReferenceSourceEnabled(
  organizationId: string,
  actorUserId: string,
  sourceId: string,
  enabled: boolean,
) {
  await db.referenceSource.findFirstOrThrow({ where: { id: sourceId, organizationId } });

  const source = await db.referenceSource.update({
    where: { id: sourceId },
    data: { enabled },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: enabled ? "reference_source.enabled" : "reference_source.disabled",
    resourceType: "ReferenceSource",
    resourceId: source.id,
  });

  return source;
}

export async function deleteReferenceSource(
  organizationId: string,
  actorUserId: string,
  sourceId: string,
) {
  const existing = await db.referenceSource.findFirstOrThrow({
    where: { id: sourceId, organizationId },
  });

  await db.referenceSource.delete({ where: { id: sourceId } });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "reference_source.deleted",
    resourceType: "ReferenceSource",
    resourceId: sourceId,
    previousState: { name: existing.name, url: existing.url },
  });
}
