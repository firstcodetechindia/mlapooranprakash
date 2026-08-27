import "server-only";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { getSocialProvider } from "./index";
import { encryptToken } from "./crypto";
import type { Platform } from "@/generated/prisma/enums";

export function listSocialAccounts(organizationId: string) {
  return db.socialAccount.findMany({
    where: { organizationId },
    orderBy: { platform: "asc" },
  });
}

export async function connectSocialAccount(
  organizationId: string,
  actorUserId: string,
  platform: Platform,
  accessToken: string,
) {
  const provider = getSocialProvider(platform);
  const identity = await provider.connect(accessToken);

  const account = await db.socialAccount.upsert({
    where: { organizationId_platform: { organizationId, platform } },
    update: {
      accountName: identity.accountName,
      externalAccountId: identity.externalAccountId,
      accessTokenEncrypted: encryptToken(accessToken),
      status: "CONNECTED",
      lastError: null,
      connectedById: actorUserId,
    },
    create: {
      organizationId,
      platform,
      accountName: identity.accountName,
      externalAccountId: identity.externalAccountId,
      accessTokenEncrypted: encryptToken(accessToken),
      connectedById: actorUserId,
    },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "social_account.connected",
    resourceType: "SocialAccount",
    resourceId: account.id,
    newState: { platform, accountName: identity.accountName },
  });

  return account;
}

export async function disconnectSocialAccount(
  organizationId: string,
  actorUserId: string,
  accountId: string,
) {
  const existing = await db.socialAccount.findFirstOrThrow({
    where: { id: accountId, organizationId },
  });

  await db.socialAccount.update({
    where: { id: accountId },
    data: { status: "DISCONNECTED" },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "social_account.disconnected",
    resourceType: "SocialAccount",
    resourceId: accountId,
    previousState: { platform: existing.platform, accountName: existing.accountName },
  });
}
