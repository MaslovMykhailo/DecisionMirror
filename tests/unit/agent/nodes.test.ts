import { describe, expect, it, vi } from "vitest";

import { createAnalyzeNode, createLoadMemoryNode, validateNode } from "@/agent/nodes";
import {
  invalidAnalysisOutputs,
  validAnalysisOutput,
} from "@/tests/support/fixtures/analysis-output";

function createDecision() {
  return {
    id: "decision_1",
    userId: "user_1",
    situation: "Should I accept the new role?",
    decision: "Accept the offer.",
    reasoning: "It has more scope.",
  };
}

describe("agent nodes", () => {
  it("loads the decision, latest processing analysis, and prior patterns", async () => {
    const db = {
      decision: { findUnique: vi.fn().mockResolvedValue(createDecision()) },
      analysis: {
        findFirst: vi.fn().mockResolvedValue({ id: "analysis_1", version: 2 }),
        update: vi.fn(),
      },
    };
    const memory = {
      recall: vi.fn().mockResolvedValue(["You often choose quickly under workload pressure."]),
      remember: vi.fn(),
    };

    const result = await createLoadMemoryNode({ db, memory })({ decisionId: "decision_1" });

    expect(db.decision.findUnique).toHaveBeenCalledWith({
      where: { id: "decision_1" },
      select: {
        id: true,
        userId: true,
        situation: true,
        decision: true,
        reasoning: true,
      },
    });
    expect(db.analysis.findFirst).toHaveBeenCalledWith({
      where: { decisionId: "decision_1", status: "processing" },
      orderBy: { version: "desc" },
      select: { id: true, version: true },
    });
    expect(memory.recall).toHaveBeenCalledWith({
      decisionId: "decision_1",
      decisionInput: {
        situation: "Should I accept the new role?",
        decision: "Accept the offer.",
        reasoning: "It has more scope.",
      },
      userId: "user_1",
    });
    expect(result).toMatchObject({
      canAnalyze: true,
      analysisId: "analysis_1",
      analysisVersion: 2,
      userId: "user_1",
      locale: "en",
      priorPatterns: ["You often choose quickly under workload pressure."],
    });
  });

  it("does not call the provider when no processing analysis exists", async () => {
    const provider = { analyzeDecision: vi.fn() };
    const analyzeNode = createAnalyzeNode({ provider });

    const result = await analyzeNode({
      decisionId: "decision_1",
      canAnalyze: false,
      failureReason: "No processing analysis is available for this decision.",
    });

    expect(provider.analyzeDecision).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});

describe("validation node", () => {
  it("accepts valid provider output", async () => {
    await expect(
      validateNode({ decisionId: "decision_1", rawOutput: validAnalysisOutput }),
    ).resolves.toEqual({
      validatedOutput: validAnalysisOutput,
      failureReason: undefined,
    });
  });

  it("turns invalid provider output into a human-readable failure reason", async () => {
    await expect(
      validateNode({
        decisionId: "decision_1",
        rawOutput: invalidAnalysisOutputs.unknownCategory,
      }),
    ).resolves.toEqual({
      validatedOutput: undefined,
      failureReason: expect.stringContaining("structured analysis output"),
    });
  });
});
