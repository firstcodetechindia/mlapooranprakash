import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { edgeAuthConfig } from "@/lib/auth/edge-config";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authConfig: NextAuthConfig = {
  ...edgeAuthConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Keyed by the attempted email, not IP — this is a brute-force
        // guard against one targeted account, not general abuse
        // prevention, so it has to hold even from behind a shared/rotating
        // IP (an office network, a VPN, a botnet).
        try {
          await enforceRateLimit(`login:${email.toLowerCase()}`, 8, 300);
        } catch (error) {
          if (error instanceof RateLimitError) return null;
          throw error;
        }

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await recordAuditLog({
          organizationId: (
            await db.membership.findFirst({ where: { userId: user.id } })
          )?.organizationId ?? "unknown",
          userId: user.id,
          action: "auth.login",
          resourceType: "User",
          resourceId: user.id,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    ...edgeAuthConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }

      // Re-reads memberships/roles from the database on every token check
      // rather than trusting a stale JWT claim — a role change or removal
      // takes effect immediately instead of waiting for token expiry.
      const userId = token.userId as string | undefined;
      if (userId) {
        const memberships = await db.membership.findMany({
          where: { userId },
          include: { organization: true },
        });
        token.memberships = memberships.map((m) => ({
          organizationId: m.organizationId,
          organizationName: m.organization.name,
          organizationSlug: m.organization.slug,
          role: m.role,
        }));
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.memberships =
          (token.memberships as typeof session.user.memberships) ?? [];
      }
      return session;
    },
  },
};
