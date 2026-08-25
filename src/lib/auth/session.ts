import "server-only";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/lib/auth";
import type { SessionMembership } from "@/types/next-auth";

/**
 * Phase 1 always operates on the caller's first Organization membership.
 * Once the product needs to support switching between multiple
 * organizations in one session, replace this with a cookie-backed
 * "active organization" selection.
 */
export async function requireActiveMembership(): Promise<{
  session: Session;
  membership: SessionMembership;
}> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const membership = session.user.memberships[0];
  if (!membership) {
    redirect("/login");
  }

  return { session, membership };
}
