import "server-only";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";

export const signupSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});

export type SignupInput = z.infer<typeof signupSchema>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "EmailAlreadyRegisteredError";
  }
}

/**
 * Creates a brand-new Organization together with its first User, who
 * becomes SUPER_ADMIN. This is the only way an Organization comes into
 * existence in Phase 1 — later phases add team invitations (Membership
 * rows for additional users) on top of it.
 */
export async function createOrganizationWithOwner(input: SignupInput) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new EmailAlreadyRegisteredError();
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const baseSlug = slugify(input.organizationName) || "organization";

  let slug = baseSlug;
  let attempt = 0;
  while (await db.organization.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const result = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.organizationName, slug },
    });

    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
      },
    });

    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: "SUPER_ADMIN",
        acceptedAt: new Date(),
      },
    });

    return { organization, user };
  });

  await recordAuditLog({
    organizationId: result.organization.id,
    userId: result.user.id,
    action: "organization.created",
    resourceType: "Organization",
    resourceId: result.organization.id,
    newState: { name: result.organization.name, slug: result.organization.slug },
  });

  return result;
}
