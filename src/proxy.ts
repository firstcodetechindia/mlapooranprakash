import NextAuth from "next-auth";

import { edgeAuthConfig } from "@/lib/auth/edge-config";

// Kept edge-safe (no Prisma/bcrypt) even though Proxy now defaults to the
// Node.js runtime as of Next.js 16 — this avoids a database round trip on
// every matched request just to answer "is this session logged in".
const { auth } = NextAuth(edgeAuthConfig);

export default auth;

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};
