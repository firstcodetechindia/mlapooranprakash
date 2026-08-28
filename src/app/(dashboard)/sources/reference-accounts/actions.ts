"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationAccess } from "@/lib/security/authorize";
import {
  createReferenceSource,
  deleteReferenceSource,
  referenceSourceSchema,
  setReferenceSourceEnabled,
  updateReferenceSource,
  type ReferenceSourceInput,
} from "@/lib/sources/service";
import { fetchReferenceSource, SourceNotFetchableError } from "@/lib/sources/rss";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export interface SourceActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function parseInput(input: unknown) {
  const parsed = referenceSourceSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false as const, fieldErrors };
  }
  return { ok: true as const, data: parsed.data };
}

export async function createSourceAction(
  organizationId: string,
  input: ReferenceSourceInput,
): Promise<SourceActionResult> {
  const { session } = await requireOrganizationAccess(organizationId, "ADMIN");

  const parsed = parseInput(input);
  if (!parsed.ok) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  await createReferenceSource(organizationId, session.user.id, parsed.data);
  revalidatePath("/sources/reference-accounts");
  return { ok: true };
}

export async function updateSourceAction(
  organizationId: string,
  sourceId: string,
  input: ReferenceSourceInput,
): Promise<SourceActionResult> {
  const { session } = await requireOrganizationAccess(organizationId, "ADMIN");

  const parsed = parseInput(input);
  if (!parsed.ok) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  await updateReferenceSource(organizationId, session.user.id, sourceId, parsed.data);
  revalidatePath("/sources/reference-accounts");
  return { ok: true };
}

export async function deleteSourceAction(organizationId: string, sourceId: string) {
  const { session } = await requireOrganizationAccess(organizationId, "ADMIN");
  await deleteReferenceSource(organizationId, session.user.id, sourceId);
  revalidatePath("/sources/reference-accounts");
}

export async function toggleSourceAction(
  organizationId: string,
  sourceId: string,
  enabled: boolean,
) {
  const { session } = await requireOrganizationAccess(organizationId, "ADMIN");
  await setReferenceSourceEnabled(organizationId, session.user.id, sourceId, enabled);
  revalidatePath("/sources/reference-accounts");
}

export interface FetchActionResult {
  ok: boolean;
  message: string;
}

export async function fetchSourceNowAction(
  organizationId: string,
  sourceId: string,
): Promise<FetchActionResult> {
  const { session } = await requireOrganizationAccess(organizationId, "EDITOR");
  // Unbounded external fetch trigger otherwise — same per-org budget
  // reasoning as the AI-cost actions, just guarding against hammering a
  // third-party feed instead of API spend.
  await enforceRateLimit(`fetch-source:${organizationId}`, 30, 3600);

  try {
    const result = await fetchReferenceSource(sourceId, organizationId, session.user.id);
    revalidatePath("/sources/reference-accounts");
    if (!result.ok) {
      return { ok: false, message: result.error ?? "Fetch failed." };
    }
    return {
      ok: true,
      message: `Fetched ${result.itemsFound} items, ${result.itemsIngested} new.`,
    };
  } catch (error) {
    if (error instanceof SourceNotFetchableError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}
