import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit + component tests: deterministic and offline. The LLM provider and any
// external service are always mocked here (see AGENTS.md). Integration tests that
// need a real Postgres live under tests/integration and run via vitest.integration.config.ts.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/component/**/*.test.{ts,tsx}"],
    exclude: ["tests/integration/**", "**/*.integration.test.*", "node_modules/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
