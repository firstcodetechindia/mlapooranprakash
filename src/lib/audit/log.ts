import "server-only";

import { db } from "@/lib/db/client";

export interface AuditLogInput {
  organizationId: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  previousState?: unknown;
  newState?: unknown;
  metadata?: unknown;
}

/**
 * The only writer to AuditLog. Nothing else in the app should call
 * db.auditLog.* directly — that keeps this table an honest, append-only
 * trail (see model AuditLog in prisma/schema.prisma).
 */
export async function recordAuditLog(input: AuditLogInput) {
  await db.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      previousState: toJson(input.previousState),
      newState: toJson(input.newState),
      metadata: toJson(input.metadata),
    },
  });
}

function toJson(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return JSON.parse(JSON.stringify(value));
}
