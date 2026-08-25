import "server-only";

import { auth } from "@/lib/auth";
import { ROLE_RANK, type Role } from "@/lib/config/roles";

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class UnauthenticatedError extends Error {
  constructor(message = "You must be signed in.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export function hasRoleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/**
 * Resolves the current session and the caller's role within the given
 * organization. Throws if unauthenticated, or if the caller has no
 * membership in that organization — this is the server-side tenant
 * isolation boundary. Never trust an organizationId supplied by the client
 * without passing it through this check first.
 */
export async function requireOrganizationAccess(
  organizationId: string,
  minimumRole: Role = "VIEWER",
) {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthenticatedError();
  }

  const membership = session.user.memberships.find(
    (m) => m.organizationId === organizationId,
  );

  if (!membership) {
    throw new AuthorizationError(
      "You do not have access to this organization.",
    );
  }

  if (!hasRoleAtLeast(membership.role, minimumRole)) {
    throw new AuthorizationError(
      `This action requires the ${minimumRole} role or higher.`,
    );
  }

  return { session, membership };
}

/** Convenience wrapper for routes that only need "is the caller signed in". */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthenticatedError();
  }
  return session;
}
