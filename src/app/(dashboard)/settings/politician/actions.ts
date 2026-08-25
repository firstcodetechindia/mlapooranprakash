"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationAccess } from "@/lib/security/authorize";
import {
  politicianProfileSchema,
  upsertPoliticianProfile,
  type PoliticianProfileInput,
} from "@/lib/politician/profile";

export interface SaveProfileResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function savePoliticianProfileAction(
  organizationId: string,
  input: PoliticianProfileInput,
): Promise<SaveProfileResult> {
  const { session } = await requireOrganizationAccess(organizationId, "ADMIN");

  const parsed = politicianProfileSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  await upsertPoliticianProfile(organizationId, session.user.id, parsed.data);
  revalidatePath("/settings/politician");

  return { ok: true };
}
