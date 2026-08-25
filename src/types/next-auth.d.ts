import type { Role } from "@/lib/config/roles";

export interface SessionMembership {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: Role;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      memberships: SessionMembership[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    memberships?: SessionMembership[];
  }
}
