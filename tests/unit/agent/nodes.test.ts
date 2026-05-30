import { describe, expect, it, vi } from "vitest";

import {
  createAnalyzeNode,
  createLoadMemoryNode,
  failedAnalysisData,
  validateNode,
} from "@/agent/nodes";
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
        findFirst: vi.fn().mockResolvedValue({ id: "analysis_1", version: 2, locale: "uk" }),
        update: vi.fn(),
      },
    };
    const memory = {
      recall: vi.fn().mockResolvedValue({
        patterns: ["You often choose quickly under workload pressure."],
        recalledIds: ["mem_1"],
      }),
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
      select: { id: true, version: true, locale: true },
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
      locale: "uk",
      priorPatterns: ["You often choose quickly under workload pressure."],
    });
  });

  it("passes the loaded locale into provider analysis", async () => {
    const provider = { analyzeDecision: vi.fn().mockResolvedValue(validAnalysisOutput) };
    const analyzeNode = createAnalyzeNode({ provider });

    await analyzeNode({
      decisionId: "decision_1",
      canAnalyze: true,
      locale: "uk",
      decisionInput: {
        situation: "Працюю в компанії більше 7 років",
        decision: "Поки вирішив не міняти роботу",
        reasoning: "Маю кредит довіри, але не розвиваюся",
      },
      priorPatterns: [],
    });

    expect(provider.analyzeDecision).toHaveBeenCalledWith({
      locale: "uk",
      situation: "Працюю в компанії більше 7 років",
      decision: "Поки вирішив не міняти роботу",
      reasoning: "Маю кредит довіри, але не розвиваюся",
      priorPatterns: [],
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

describe("agent persistence data", () => {
  it("does not require structured result fields when marking an analysis failed", () => {
    const data = failedAnalysisData("Memory recall failed. Please retry.");

    expect(data).toEqual({
      status: "failed",
      category: null,
      failureReason: "Memory recall failed. Please retry.",
    });
    expect(data).not.toHaveProperty("biases");
    expect(data).not.toHaveProperty("missedAlternatives");
    expect(data).not.toHaveProperty("premortemRisks");
    expect(data).not.toHaveProperty("keyAssumptions");
    expect(data).not.toHaveProperty("warningSigns");
  });
});
