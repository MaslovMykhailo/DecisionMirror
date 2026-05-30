import { describe, expect, it, vi } from "vitest";

import { createLoadMemoryNode } from "@/agent/nodes";

function createDb() {
  return {
    decision: {
      findUnique: vi.fn().mockResolvedValue({
        id: "decision_1",
        userId: "user_1",
        situation: "Should I accept the new role?",
        decision: "Accept the offer.",
        reasoning: "It has more scope.",
      }),
    },
    analysis: {
      findFirst: vi.fn().mockResolvedValue({ id: "analysis_1", version: 2, locale: "en" }),
      update: vi.fn(),
    },
  };
}

describe("runAgent LangSmith run metadata", () => {
  it("attaches recalled-memory ids (by reference) and version to the run config metadata", async () => {
    const db = createDb();
    const memory = {
      recall: vi.fn().mockResolvedValue({
        patterns: ["choose quickly under pressure"],
        recalledIds: ["mem_1", "mem_2"],
      }),
      remember: vi.fn(),
    };
    const config = { metadata: {} as Record<string, unknown> };

    const result = await createLoadMemoryNode({ db, memory })({ decisionId: "decision_1" }, config);

    expect(config.metadata).toMatchObject({
      decisionId: "decision_1",
      version: 2,
      recalledMemoryIds: ["mem_1", "mem_2"],
    });
    // The recalled-memory references carry ids only — no raw recalled content.
    expect(JSON.stringify(config.metadata)).not.toContain("choose quickly");
    expect(result.priorPatterns).toEqual(["choose quickly under pressure"]);
  });

  it("does not throw when invoked without a trace config (tracing unconfigured)", async () => {
    const db = createDb();
    const memory = {
      recall: vi.fn().mockResolvedValue({ patterns: [], recalledIds: [] }),
      remember: vi.fn(),
    };

    await expect(
      createLoadMemoryNode({ db, memory })({ decisionId: "decision_1" }),
    ).resolves.toMatchObject({ canAnalyze: true });
  });
});
