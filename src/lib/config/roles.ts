import { Role } from "@/generated/prisma/enums";

export { Role };

/**
 * Ordered from least to most privileged. Used for "at least this role"
 * checks — see hasRoleAtLeast() in /src/lib/security/authorize.ts.
 */
export const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  ANALYST: 1,
  EDITOR: 2,
  APPROVER: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  EDITOR: "Editor",
  APPROVER: "Approver",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: "Full control across the organization, including billing and team management.",
  ADMIN: "Manages settings, sources, integrations, and team members.",
  EDITOR: "Creates and edits drafts. Cannot approve or publish.",
  APPROVER: "Reviews and approves drafts for scheduling and publishing.",
  ANALYST: "Read-only access plus analytics exports.",
  VIEWER: "Read-only access to the command center.",
};

export const ALL_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "EDITOR",
  "APPROVER",
  "ANALYST",
  "VIEWER",
];
