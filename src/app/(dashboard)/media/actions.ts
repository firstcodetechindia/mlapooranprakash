"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationAccess } from "@/lib/security/authorize";
import { deleteMedia } from "@/lib/media/service";

export async function deleteMediaAction(organizationId: string, assetId: string) {
  const { session } = await requireOrganizationAccess(organizationId, "EDITOR");
  await deleteMedia(organizationId, session.user.id, assetId);
  revalidatePath("/media");
}
