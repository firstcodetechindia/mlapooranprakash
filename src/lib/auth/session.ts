import "server-only";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/lib/auth";
import type { SessionMembership } from "@/types/next-auth";

/**
 * Always operates on the caller's first Organization membership. Since
 * there's no team-invitation flow yet (see signup.ts), most users only
 * ever have one — this becomes a real limitation once that changes.
 * Replace with a cookie-backed "active organization" selection at that
 * point.
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
