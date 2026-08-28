"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/security/authorize";
import { markAllRead } from "@/lib/notifications/service";

export async function markAllReadAction() {
  const session = await requireSession();
  const organizationId = session.user.memberships[0]?.organizationId;
  if (!organizationId) return;
  await markAllRead(session.user.id, organizationId);
  revalidatePath("/", "layout");
}
