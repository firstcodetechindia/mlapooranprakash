"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/security/authorize";
import { markAllRead } from "@/lib/notifications/service";

export async function markAllReadAction() {
  const session = await requireSession();
  await markAllRead(session.user.id);
  revalidatePath("/", "layout");
}
