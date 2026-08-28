import "server-only";

import { db } from "@/lib/db/client";
import type { Role } from "@/lib/config/roles";
import { ROLE_RANK } from "@/lib/config/roles";
import type { NotificationType } from "@/generated/prisma/enums";

interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/** Single writer for the Notification table — nothing else should call db.notification.create directly. */
export async function createNotification(organizationId: string, userId: string, input: NotificationInput) {
  return db.notification.create({
    data: {
      organizationId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    },
  });
}

export async function notifyUser(organizationId: string, userId: string | null | undefined, input: NotificationInput) {
  if (!userId) return;
  await createNotification(organizationId, userId, input);
}

/**
 * Fans out to every member of the org whose role is at least minimumRole —
 * e.g. "a draft needs review" goes to every APPROVER, ADMIN, and
 * SUPER_ADMIN, not just whoever happens to be looking at the queue.
 */
export async function notifyRole(
  organizationId: string,
  minimumRole: Role,
  input: NotificationInput,
  excludeUserId?: string,
) {
  const qualifyingRoles = (Object.keys(ROLE_RANK) as Role[]).filter(
    (role) => ROLE_RANK[role] >= ROLE_RANK[minimumRole],
  );

  const members = await db.membership.findMany({
    where: {
      organizationId,
      role: { in: qualifyingRoles },
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { userId: true },
  });

  await Promise.all(members.map((m) => createNotification(organizationId, m.userId, input)));
}

// Scoped by organizationId, not just userId — a user with memberships in
// more than one org should only see the current org's notifications in
// its bell, not a mix of every org they've ever belonged to.
export function listNotifications(userId: string, organizationId: string, limit = 10) {
  return db.notification.findMany({
    where: { userId, organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function countUnread(userId: string, organizationId: string) {
  return db.notification.count({ where: { userId, organizationId, readAt: null } });
}

export async function markAllRead(userId: string, organizationId: string) {
  await db.notification.updateMany({
    where: { userId, organizationId, readAt: null },
    data: { readAt: new Date() },
  });
}
