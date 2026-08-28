import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests run against a real Postgres database (political_command_center_test,
// same container as dev — see docs/deployment.md for setup) rather than a
// mocked Prisma client: the things most worth regression-testing here
// (tenant isolation, idempotent publishing, rate-limit windows) are exactly
// the kind of bug that a mocked ORM would hide. Sequential/single-fork
// because every test shares that one database — see src/test/fixtures.ts.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    // The "server-only" package resolves to a no-op under the "react-server"
    // export condition (how Next's own RSC bundler treats it) and to a
    // throwing stub under every other condition, Vitest's default included —
    // without this, every server-only-guarded lib module is untestable.
    // Vitest's Node-environment tests run through Vite's SSR resolution
    // pipeline, which reads ssr.resolve.conditions rather than resolve.conditions.
    conditions: ["react-server"],
  },
  ssr: {
    resolve: {
      conditions: ["react-server"],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 15000,
    fileParallelism: false,
    env: {
      DATABASE_URL: "postgresql://pscc:pscc_dev_local_only@localhost:5544/political_command_center_test?schema=public",
      ENCRYPTION_KEY: "dGVzdC1lbmNyeXB0aW9uLWtleS1mb3ItdW5pdC10ZXN0cyEh",
      MOCK_SOCIAL_APIS: "true",
    },
  },
});
