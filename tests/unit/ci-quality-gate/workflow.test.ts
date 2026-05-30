import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const WORKFLOWS_DIR = join(process.cwd(), ".github", "workflows");

function workflowFiles(): string[] {
  if (!existsSync(WORKFLOWS_DIR)) return [];
  return readdirSync(WORKFLOWS_DIR)
    .filter((entry) => /\.ya?ml$/.test(entry))
    .map((entry) => join(WORKFLOWS_DIR, entry))
    .sort();
}

function allWorkflowText(): string {
  return workflowFiles()
    .map((file) => readFileSync(file, "utf8"))
    .join("\n--- workflow ---\n");
}

describe("CI quality gate workflow", () => {
  it("defines a GitHub Actions workflow for pull requests and main pushes", () => {
    const text = allWorkflowText();

    expect(workflowFiles().map((file) => file.replace(process.cwd(), ""))).not.toEqual([]);
    expect(text).toMatch(/\bpull_request\s*:/);
    expect(text).toMatch(/\bpush\s*:/);
    expect(text).toMatch(/\bbranches\s*:\s*\n\s*-\s*main\b/);
  });

  it("runs every deterministic local gate command", () => {
    const text = allWorkflowText();

    for (const command of [
      "pnpm format:check",
      "pnpm lint",
      "pnpm typecheck",
      "pnpm test",
      "pnpm test:integration",
      "pnpm build",
      "pnpm test:e2e",
    ]) {
      expect(text).toContain(command);
    }
  });

  it("uses a pgvector-capable Postgres service and migrated schema for database tests", () => {
    const text = allWorkflowText();

    expect(text).toMatch(/\bservices\s*:/);
    expect(text).toMatch(/\bpostgres\s*:/);
    expect(text).toMatch(/\bimage\s*:\s*pgvector\/pgvector:/);
    expect(text).toContain("5432:5432");
    expect(text).toContain("pnpm db:migrate:deploy");
    expect(text).toContain("pnpm db:setup-checkpointer");
  });

  it("does not deploy or depend on real provider secrets in deterministic jobs", () => {
    const text = allWorkflowText();

    expect(text).not.toMatch(/\bvercel\s+deploy\b|npx\s+vercel\b|pnpm\s+vercel\b/i);
    expect(text).not.toMatch(/secrets\.(OPENAI|VOYAGE|LANGSMITH|POSTHOG|SENTRY)/);
  });
});
