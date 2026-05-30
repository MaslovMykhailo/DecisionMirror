import { describe, expect, it } from "vitest";

import { attachRunMetadata, langsmithTracingEnabled } from "@/lib/observability/langsmith";

describe("langsmith tracing gate", () => {
  it("is enabled only when tracing flag, api key, and project are all configured", () => {
    expect(
      langsmithTracingEnabled({
        LANGSMITH_TRACING: "true",
        LANGSMITH_API_KEY: "ls_key",
        LANGSMITH_PROJECT: "decision-analysis",
      }),
    ).toBe(true);
  });

  it("is disabled when the tracing flag is off or unset", () => {
    expect(langsmithTracingEnabled({})).toBe(false);
    expect(
      langsmithTracingEnabled({
        LANGSMITH_TRACING: "false",
        LANGSMITH_API_KEY: "k",
        LANGSMITH_PROJECT: "p",
      }),
    ).toBe(false);
  });

  it("is disabled in a headless/cron context where the project or key is absent", () => {
    // Tracing flag on, but no project — must not trace to a shared/default project.
    expect(langsmithTracingEnabled({ LANGSMITH_TRACING: "true", LANGSMITH_API_KEY: "k" })).toBe(
      false,
    );
    // Project set but no key.
    expect(langsmithTracingEnabled({ LANGSMITH_TRACING: "true", LANGSMITH_PROJECT: "p" })).toBe(
      false,
    );
  });
});

describe("run metadata attachment", () => {
  it("merges scrubbed metadata into the runnable config", () => {
    const config = { metadata: { existing: 1 } };
    attachRunMetadata(config, { recalledMemoryIds: ["mem_1", "mem_2"], version: 2 });
    expect(config.metadata).toEqual({
      existing: 1,
      recalledMemoryIds: ["mem_1", "mem_2"],
      version: 2,
    });
  });

  it("strips prose that would leak into metadata", () => {
    const config: { metadata?: Record<string, unknown> } = {};
    attachRunMetadata(config, { note: "a prose note that must not leak", version: 1 });
    expect(config.metadata).toEqual({ version: 1 });
  });

  it("is a safe no-op when there is no config", () => {
    expect(() => attachRunMetadata(undefined, { version: 1 })).not.toThrow();
  });
});
