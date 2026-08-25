// Demo/dev seed data. Everything here is fictional — no real political
// claims, quotes, or figures. See /docs/development.md for how to run it.
//
// Phase 1 only seeds the auth/org/RBAC foundation (one demo organization
// with one user per role). Later phases extend this file with reference
// sources, opportunities, drafts, and analytics as those models ship.

import bcrypt from "bcryptjs";

import { db } from "../src/lib/db/client";
import { ALL_ROLES } from "../src/lib/config/roles";

const DEMO_PASSWORD = "Demo12345!";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const organization = await db.organization.upsert({
    where: { slug: "demo-office" },
    update: {},
    create: {
      name: "Demo Office of Public Affairs",
      slug: "demo-office",
    },
  });

  for (const role of ALL_ROLES) {
    const email = `${role.toLowerCase().replace("_", "-")}@demo.local`;
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `Demo ${role.replace("_", " ")}`,
        email,
        passwordHash,
      },
    });

    await db.membership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organization.id,
        },
      },
      update: { role },
      create: {
        userId: user.id,
        organizationId: organization.id,
        role,
        acceptedAt: new Date(),
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Organization: ${organization.name} (${organization.slug})`);
  console.log(`Sign in as any role, e.g. super-admin@demo.local`);
  console.log(`Password for all demo accounts: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
