import { defineConfig } from "vitest/config";

// Integration tests run against a real Postgres + pgvector (docker compose locally,
// service container in CI). The LLM provider is still mocked at the wrapper boundary.
// These tests self-skip when DATABASE_URL is not set so the default `pnpm test` stays
// fully offline.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.integration.test.{ts,tsx}"],
    exclude: ["node_modules/**"],
    testTimeout: 30000,
  },
});
