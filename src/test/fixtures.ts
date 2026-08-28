import { randomUUID } from "node:crypto";

import { db } from "@/lib/db/client";
import type { Role, Platform } from "@/generated/prisma/enums";

/**
 * Every test creates its own Organization and deletes it in an afterEach —
 * onDelete: Cascade on organizationId across the schema means one delete
 * cleans up every Draft/SocialPost/Notification/etc. created under it, the
 * same pattern used throughout this project's manual live-verification
 * passes (see git log for the "Verified live" sections), just automated.
 */
export async function createTestOrg(namePrefix = "Test Org") {
  const id = randomUUID();
  await db.organization.create({
    data: { id, name: `${namePrefix} ${id.slice(0, 8)}`, slug: `test-${id}` },
  });
  return id;
}

export async function createTestUser(emailPrefix = "test") {
  const id = randomUUID();
  await db.user.create({
    data: { id, email: `${emailPrefix}-${id}@example.test`, name: "Test User" },
  });
  return id;
}

export async function addMembership(userId: string, organizationId: string, role: Role) {
  await db.membership.create({ data: { userId, organizationId, role } });
}

export async function createConnectedAccount(organizationId: string, platform: Platform = "X") {
  const id = randomUUID();
  await db.socialAccount.create({
    data: {
      id,
      organizationId,
      platform,
      status: "CONNECTED",
      accountName: "Test Account",
      externalAccountId: `ext-${id}`,
      accessTokenEncrypted: "test-token",
    },
  });
  return id;
}

export async function createDraft(
  organizationId: string,
  overrides: Partial<{
    platform: Platform;
    body: string;
    status: string;
    createdById: string | null;
    approvedById: string | null;
  }> = {},
) {
  const id = randomUUID();
  await db.draft.create({
    data: {
      id,
      organizationId,
      platform: overrides.platform ?? "X",
      format: "SHORT_POST",
      language: "ENGLISH",
      tone: "FORMAL",
      body: overrides.body ?? "Test draft body.",
      hashtags: [],
      status: (overrides.status as never) ?? "APPROVED",
      createdById: overrides.createdById,
      approvedById: overrides.approvedById,
    },
  });
  return id;
}

export async function cleanupOrg(organizationId: string) {
  await db.organization.delete({ where: { id: organizationId } }).catch(() => {});
}

export async function cleanupUser(userId: string) {
  await db.user.delete({ where: { id: userId } }).catch(() => {});
}
