import "server-only";

import { db } from "@/lib/db/client";

const PAGE_SIZE = 50;

export async function listAuditLogs(organizationId: string, page = 1) {
  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } } },
    }),
    db.auditLog.count({ where: { organizationId } }),
  ]);

  return { entries, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
