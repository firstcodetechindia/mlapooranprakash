import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe subset of the auth config: no providers, no Node-only
 * dependencies (Prisma, bcrypt). This is what src/proxy.ts runs on every
 * matched request. The full config with providers lives in ./config.ts and
 * is only ever imported from route handlers, server components, and server
 * actions.
 */
export const edgeAuthConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  // Infer the request origin from headers instead of a fixed AUTH_URL —
  // required behind Vercel's dynamic preview URLs and local dev's
  // auto-assigned ports alike. Safe because Next.js validates the Host
  // header against trusted origins before it reaches here.
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");
      const isOnboardingRoute = request.nextUrl.pathname.startsWith("/onboarding");

      if (isDashboardRoute || isOnboardingRoute) {
        return isLoggedIn;
      }
      return true;
    },
  },
};
