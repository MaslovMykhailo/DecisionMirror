import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET ?? "test-auth-secret-at-least-32-characters",
      AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? "test-google-id",
      AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ?? "test-google-secret",
      DATABASE_URL: process.env.DATABASE_URL ?? "",
    },
  },
});
