"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationAccess } from "@/lib/security/authorize";
import { connectSocialAccount, disconnectSocialAccount } from "@/lib/social/accounts";
import type { Platform } from "@/generated/prisma/enums";

export interface ConnectResult {
  ok: boolean;
  error?: string;
}

export async function connectAccountAction(
  organizationId: string,
  platform: Platform,
  accessToken: string,
): Promise<ConnectResult> {
  const { session } = await requireOrganizationAccess(organizationId, "ADMIN");

  try {
    await connectSocialAccount(organizationId, session.user.id, platform, accessToken);
    revalidatePath("/settings/integrations");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Connection failed." };
  }
}

export async function disconnectAccountAction(organizationId: string, accountId: string) {
  const { session } = await requireOrganizationAccess(organizationId, "ADMIN");
  await disconnectSocialAccount(organizationId, session.user.id, accountId);
  revalidatePath("/settings/integrations");
}
